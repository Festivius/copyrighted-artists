import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';

const app = express();
const server = createServer(app);
const io = new Server(server);

const players = {};
const rooms = {};
const pairs = {};


app.use(express.static('public'));

function randomPrompt() {
    const prompts = [
        "pig", "dragon", "superhero", "moon", "cat", "dino", "forest",
        "robot", "map", "castle", "mermaid", "wizard", "house", "clown", "balloon",
        "flying pig", "fire dragon", "moon landing", "cat guitar",
        "dino hat", "magic forest", "dancing robot", "treasure map",
        "cloud castle", "sea mermaid", "wizard spell", "haunted house",
        "juggling clown", "hot air balloon",
        "space dragon", "pirate cat", "singing moon", "cloud castle",
        "dog astronaut", "magic tree", "time robot", "treehouse", 
        "jungle map", "underwater city", "viking boat", "friendly ghost", 
        "big mushroom", "magic carpet", "treasure chest", "rainbow bridge", 
        "star tent", "ice palace", "snowman hat", "parrot pirate", 
        "car dino", "animal balloon",
        "happy sun", "smiling flower", "starry sky", "ice cream", 
        "rocket ship", "skating turtle", "water elephant", 
        "pizza slice", "cute bee", "dancing banana", "penguin slide", 
        "friendly shark", "leaf butterfly", "duck pond", "hot cocoa", 
        "fish bowl", "bike ride", "wavy ocean", "shooting star", "magic wand",
        "panda skating", "surfing dog", "jumping whale", "campfire", 
        "basketball hoop", "snail house", "ufo", "golden crown", 
        "fireworks", "treasure island", "pirate ship"
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    players[socket.id] = { partner: null, username: null, role: null, prompt: null, points: 0, canvas: null };

    function leaveRooms() {
        for (let roomCode in rooms) {
            const room = rooms[roomCode];
            if (room.clients.includes(socket.id)) {
                socket.leave(roomCode);
                socket.broadcast.emit('playerLeft', players[socket.id].username, roomCode);
                room.clients = room.clients.filter(clientId => clientId !== socket.id);
                if (room.clients.length === 0) {
                    delete rooms[roomCode];
                }
            }
        }
    }

    function pairPlayers(currentRoom) {
        try {
            const roomPlayers = {};
            rooms[currentRoom].clients.forEach(clientId => {
                roomPlayers[clientId] = players[clientId];
            });
            const room = rooms[currentRoom];
            const prompt = randomPrompt();
            pairs[currentRoom] = [];
            let roomPairs = pairs[currentRoom];

            console.log(players, roomPlayers, rooms);

            Object.values(roomPlayers).forEach(player => {
                player.partner = null;
            });
        
            const unpaired = room.clients.filter(id => !roomPlayers[id].partner);
    
            for (let i = unpaired.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [unpaired[i], unpaired[j]] = [unpaired[j], unpaired[i]];
            }
        
            for (let i = 0; i < unpaired.length - 1; i += 2) {
                players[unpaired[i]].partner = unpaired[i + 1];
                players[unpaired[i + 1]].partner = unpaired[i];
        
                players[unpaired[i]].role = 'drawer';
                players[unpaired[i + 1]].role = 'copier';
                players[unpaired[i]].prompt = prompt;
                players[unpaired[i + 1]].prompt = prompt;

                roomPairs.push([unpaired[i], unpaired[i + 1]]);
            }
        
            if (unpaired.length % 2 === 1) {
                const lastPlayer = unpaired[unpaired.length - 1];
                const firstPair = unpaired[0];
                players[lastPlayer].partner = firstPair;
                players[firstPair].partner = lastPlayer;
        
                players[lastPlayer].role = 'copier';
                players[firstPair].role = 'drawer';
                players[lastPlayer].prompt = prompt;
                players[firstPair].prompt = prompt;

                roomPairs.push([lastPlayer, firstPair]);
            }
        } catch (err) {
            console.error('Error pairing players:', err);
        }
    }

    socket.on('draw', (data) => {
        const { type, x1, y1, x2, y2, color, size } = data;
        try {
            socket.broadcast.emit('draw', data, socket.id, players);
        } catch (err) {
            console.error('Error saving drawing action:', err);
        }
    });

    socket.on('updateViewCanvas', (data) => {
        socket.broadcast.emit('updateViewCanvas', data, socket.id, players);
    });

    socket.on('createRoom', () => {
        leaveRooms();
        let roomCode = Math.floor(1000 + Math.random() * 9000);
        while (rooms[roomCode]) {
            roomCode = Math.floor(1000 + Math.random() * 9000);
        }
        rooms[roomCode] = { clients: [] };
        socket.emit('roomCreated', { roomCode });
        console.log(`Room created with code: ${roomCode}`);
    });

    socket.on('joinRoom', (data) => {
        const roomCode = data.roomCode;
        const username = data.username;

        players[socket.id].username = username;
        if (rooms[roomCode]) {
            socket.join(roomCode);
            rooms[roomCode].clients.push(socket.id);
            console.log(`${socket.id} joined room: ${roomCode}`);

            const usernames = rooms[roomCode].clients.map(clientId => players[clientId].username);

            socket.emit('joinedRoom', { code: roomCode, usernames: usernames });

            socket.emit('joinMsg', 'Success!');
            
            socket.broadcast.emit('playerJoined', username, roomCode);
        } else {
            socket.emit('joinMsg', 'Room does not exist!');
        }
    });

    socket.on('leaveRoom', () => {
        leaveRooms();
    });

    socket.on('voteFor', (data) => {
        try {
            const vote = data.vote;
            const pair = data.pair;

            console.log(socket.id, vote, pair);

            if (vote) {
                players[pair[vote]].points += 100;
                players[pair[Math.abs(vote-1)]].points += 30;

                if (players[pair[vote]].role === 'drawer') {
                    players[socket.id].points += 60;
                } else {
                    players[socket.id].points += 20;
                }
            } else {
                players[socket.id].points -= 20;
                players[pair[0]].points += 60;
                players[pair[1]].points += 60;
            }
        } catch (e) {
            console.log(e);
        }
    });

    socket.on('sendCanvas', (data) => {
        players[socket.id].canvas = data.imageData;
    });

    socket.on('startGame', (room, numRounds, drawTime, copyTime) => {
        if (rooms[room] && rooms[room].clients.length >= 2) {
            io.emit('startGame', room);
        } else {
            socket.emit('startError', room, 'Minimum 2 players required to start the game!');
            return;
        }

        numRounds = parseInt(numRounds);
        drawTime = parseInt(drawTime);
        copyTime = parseInt(copyTime);

        startRounds();

        async function startRounds() {
            for (let round = 1; round <= numRounds; round++) {
                pairPlayers(room);
                io.emit('startRound', { room: room, players: players, round: round, numRounds: numRounds });
                
                for (let i = drawTime+copyTime; i >= 0; i--) {
                    io.emit('updateTimer', { room: room, players: players, time: i, copyTime: copyTime });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                io.emit('requestCanvas', { room: room });

                console.log('starting voting with pairs:', pairs[room]);

                for (let pair of pairs[room]) {
                    io.emit('startVoting', { room: room, players: players, pair: pair });

                    io.emit('displayCanvas1', { room: room, players: players, pair: pair });

                    for (let i = 10; i >= 0; i--) {
                        io.emit('updateVoteTimer', { room: room, players: players, time: i });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    io.emit('stopVoting', { room: room, players: players, pair: pair });
                }

                await new Promise(resolve => setTimeout(resolve, 500));
                console.log(players);
                io.emit('showLeaderboard', { room: room, players: players });
                await new Promise(resolve => setTimeout(resolve, 8000));
            }
        }
    });

    socket.on('chatMessage', (msg, userId, roomCode) => {
        console.log('received message:', msg, userId, roomCode);

        io.emit('chatMessage', msg, userId, roomCode);
    });
    
    socket.on("disconnect", () => {
        leaveRooms();
        delete players[socket.id];
        console.log('A user disconnected:', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
