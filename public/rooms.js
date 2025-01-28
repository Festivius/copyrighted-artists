const roomForm = document.getElementById('room-form');
const usernameForm = document.getElementById('username-form');
const usernameInput = document.getElementById('enter-username');
const roomCodeEnter = document.getElementById('enter-room-code');
const createRoomBtn = document.getElementById('create-room');
const roomCodeDisplay = document.getElementById('room-code');
const roomResponse = document.getElementById('room-response');
const roomCreate = document.getElementById('room-create');
const backBtn = document.getElementById('back-btn');
const rulesTab = document.getElementById('rules-tab');
const playTab = document.getElementById('play-tab');
const startGameBtn = document.getElementById('start-game');
const plrList = document.getElementById('player-list');
const instructions = document.getElementById('instructions');
const timer = document.getElementById('time-left');

const copyButton = document.getElementById('copy-room-code');
const roomCode = document.getElementById('room-code');

const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const messages = document.getElementById('messages');

const randomUsers = ['apple', 'banana', 'orange', 'grape', 'strawberry', 'kiwi', 'watermelon', 'peach', 'pear', 'plum', 'cherry', 'blueberry', 'raspberry', 'blackberry', 'mango', 'papaya', 'pineapple', 'coconut', 'lemon', 'lime', 'apricot', 'fig', 'date', 'olive', 'pomegranate', 'avocado', 'guava', 'lychee', 'dragonfruit', 'passionfruit', 'starfruit', 'kiwano', 'durian', 'jackfruit', 'breadfruit', 'rambutan', 'longan', 'mangosteen', 'soursop', 'cherimoya', 'custard apple', 'sugar apple', 'pawpaw', 'tamarillo', 'tamarind', 'carambola', 'persimmon', 'quince', 'medlar', 'loquat', 'kumquat', 'clementine', 'mandarin', 'tangerine', 'satsuma', 'pomelo', 'bergamot', 'yuzu', 'kaff']


let username = randomUsers[Math.floor(Math.random() * randomUsers.length)];
let prevUser = '';

let votingFor = null;


copyButton.addEventListener('click', () => copyCode());
roomCreate.addEventListener('submit', (e) => createRoom(e));
roomForm.addEventListener('submit', (e) => joinRoom(e));
backBtn.addEventListener('click', () => backToStartPage());
rulesTab.addEventListener('click', () => goToRulesTab());
playTab.addEventListener('click', () => goToPlayTab());
startGameBtn.addEventListener('click', () => startGame());
usernameForm.addEventListener('submit', (e) => e.preventDefault());


function goToRulesTab() {
    document.getElementById('rules').style.display = 'block'; 
    document.getElementById('play').style.display = 'none';
    rulesTab.classList.add('bg-[#fff0d6]');
    rulesTab.classList.remove('bg-[#d0c1a6]');
    playTab.classList.add('bg-[#d0c1a6]');
    playTab.classList.remove('bg-white');
}

function goToPlayTab() {
    document.getElementById('play').style.display = 'block';
    document.getElementById('rules').style.display = 'none';
    playTab.classList.add('bg-white');
    playTab.classList.remove('bg-[#d0c1a6]');
    rulesTab.classList.add('bg-[#d0c1a6]');
    rulesTab.classList.remove('bg-[#fff0d6]');
}

function backToStartPage() {
    socket.emit('leaveRoom');
    document.getElementById('start-page').style.display = 'flex';
    document.getElementById('main').style.display = 'none';
    roomResponse.textContent = '';
    plrList.innerHTML = '';
}

function copyCode() {
    const code = roomCode.textContent.trim();
    navigator.clipboard.writeText(code);
    document.getElementById('copy-response').textContent = 'Copied!';
    document.getElementById('copy-response').style.color = 'green';
}

function createRoom(e) {
    e.preventDefault();
    console.log('creating room..');
    document.getElementById('copy-response').textContent = '';
    socket.emit('createRoom');
}

function joinRoom(e) {
    console.log(e);
    e.preventDefault();
    const roomCode = roomCodeEnter.value.trim();
    if (usernameInput.value.trim()) {
        username = usernameInput.value.trim();
    }
    
    console.log(username);

    if (roomCode) {
        console.log(`Joining room: ${roomCode}`);
        socket.emit('joinRoom', { roomCode: roomCode, username: username });
    } else {
        roomResponse.textContent = 'Invalid room code';
    }
}

function addUsername(user) {
    if (document.getElementById(user)) {
        roomResponse.textContent = 'Please choose a different username';
        return;
    }
    const playerDiv = document.createElement('div');
    playerDiv.id = user;
    playerDiv.classList.add('bg-white', 'rounded-lg', 'h-[15%]', 'p-[2%]', 'mb-[7%]', 'flex', 'items-center', 'justify-center', 'flex-col');
    playerDiv.innerHTML = `<span>${user}</span><span>0 points</span>`;
    if (user === username) playerDiv.innerHTML = `<span>${user} (you)</span><span>0 points</span>`;
    plrList.appendChild(playerDiv);
    prevUser = user;
}

function startGame() {
    console.log('ssssstart???');
    socket.emit('startGame', roomCodeDisplay.textContent, document.getElementById('num-rounds').value, document.getElementById('draw-time').value, document.getElementById('copy-time').value);
}

document.getElementById('vote-1').addEventListener('click', () => {
    votingFor = 0;
    document.getElementById('vote-1').classList.add('bg-[#525e4a]');
    document.getElementById('vote-1').classList.remove('bg-[#91A287]');
    document.getElementById('vote-1').style.color = 'white';
    document.getElementById('vote-2').classList.add('bg-[#91A287]');
    document.getElementById('vote-2').classList.remove('bg-[#525e4a]');
    document.getElementById('vote-2').style.color = 'black';
});

document.getElementById('vote-2').addEventListener('click', () => {
    votingFor = 1;
    document.getElementById('vote-2').classList.add('bg-[#525e4a]');
    document.getElementById('vote-2').classList.remove('bg-[#91A287]');
    document.getElementById('vote-2').style.color = 'white';
    document.getElementById('vote-1').classList.add('bg-[#91A287]');
    document.getElementById('vote-1').classList.remove('bg-[#525e4a]');
    document.getElementById('vote-1').style.color = 'black';
});

// make it so that the round number and timer changes at the biegnning


socket.on('roomCreated', (data) => {
    const roomCode = data.roomCode;
    if (usernameInput.value.trim()) {
        username = usernameInput.value.trim();
    }
    roomCodeDisplay.textContent = roomCode;
    roomCodeEnter.value = '';
    socket.emit('joinRoom', { roomCode: roomCode, username: username });
    console.log(`Joining room: ${roomCode}`);
});

socket.on('joinedRoom', (data) => {
    roomCodeDisplay.textContent = data.code;
    document.getElementById('start-page').style.display = 'none';
    document.getElementById('main').style.display = 'flex';
    document.getElementById('settings').style.display = 'flex';

    console.log(data.usernames);

    for (const user of data.usernames) {
        console.log('adding user:', user);
        addUsername(user);
    }
    if (usernameInput.value.trim()) {
        addUsername(usernameInput.value.trim());
    } else {
        addUsername(username);
    }
});

socket.on('joinMsg', (msg) => {
    roomResponse.textContent = msg;
});

socket.on('playerJoined', (username, roomCode) => {
    if (roomCode === roomCodeDisplay.textContent) {
        console.log('player joined:', username);
        addUsername(username);
    }
});

socket.on('playerLeft', (username, room) => {
    if (room === roomCodeDisplay.textContent) {
        console.log('player left:', username);
        document.getElementById(username).remove();
    }
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('submitting chat');
    if (chatInput.value) {
        console.log('sending message:', chatInput.value);
        socket.emit('chatMessage', chatInput.value, username, roomCodeDisplay.textContent, (lastID) => {
            console.log('Message IDreceived:', lastID);
        }); 
        chatInput.value = '';
    }
});

socket.on('chatMessage', (msg, user, room) => {
    if (room !== roomCodeDisplay.textContent) return;
    const item = document.createElement('li');
    const userText = document.createElement('span');
    const text = document.createElement('span');

    item.id = 'item';
    userText.id = 'user';
    text.id = 'text';

    userText.textContent = user + ': ';
    text.textContent = msg;

    item.classList.add('p-[1%]');

    item.appendChild(userText);
    item.appendChild(text);
    messages.appendChild(item);

    messages.scrollTo(0, messages.scrollHeight);
});

socket.on('startError', (room, msg) => {
    if (room !== roomCodeDisplay.textContent) return;
    document.getElementById('start-game-response').textContent = msg;
});

socket.on('startGame', (room) => {
    if (room !== roomCodeDisplay.textContent) return;
    console.log('starting game');
    document.getElementById('settings').style.display = 'none';
    document.getElementById('game').style.display = 'flex';
});

socket.on('startRound', (data) => {
    const room = data.room;
    const players = data.players;
    const round = data.round;

    if (room !== roomCodeDisplay.textContent) return;

    document.getElementById('game').style.display = 'flex';
    document.getElementById('leaderboard').style.display = 'none';

    document.querySelectorAll('.vote-button').forEach(button => button.style.display = 'none');
    document.getElementById('round-number').textContent = `Round ${round} of ${data.numRounds}`;
    if (room === roomCodeDisplay.textContent) {
        const plrData = players[socket.id];
        if (plrData.role === 'drawer') {
            instructions.textContent = "Draw a " + players[socket.id].prompt + "!";
            document.getElementById('left-canvas-label').textContent = "Your Drawing";
            document.getElementById('right-canvas-label').textContent = players[plrData.partner].username + "'s Copy"
        } else {
            instructions.textContent = "Copy " + players[plrData.partner].username + "'s drawing!";
            document.getElementById('left-canvas-label').textContent = "Your Copy";
            document.getElementById('right-canvas-label').textContent = players[plrData.partner].username + "'s Drawing"
        }
    }
});

socket.on('updateTimer', (data) => {
    if (data.room !== roomCodeDisplay.textContent) return;
    if (data.players[socket.id].role === 'drawer') {
        if (data.time <= data.copyTime) {
            timer.textContent = "Time's up!";
            instructions.textContent = `Wait for ${data.players[socket.id].username} to finish copying...`;
        } else {
            timer.textContent = `${data.time-data.copyTime} seconds left`;
        }
    } else {
        timer.textContent = `${data.time} seconds left`;
    }
});

socket.on('updateVoteTimer', (data) => {
    if (data.room !== roomCodeDisplay.textContent) return;
    timer.textContent = `${data.time} seconds left`;
});

socket.on('startVoting', (data) => {
    const room = data.room;
    if (room !== roomCodeDisplay.textContent) return;
    timer.textContent = "Time's up!";
    instructions.textContent = 'Vote for which drawing you think was the original ' + data.players[socket.id].prompt + '!';
    document.querySelectorAll('.vote-button').forEach(button => button.style.display = 'block');
    document.getElementById('vote-1').classList.add('bg-[#91A287]');
    document.getElementById('vote-1').classList.remove('bg-[#525e4a]');
    document.getElementById('vote-1').style.color = 'black';
    document.getElementById('vote-2').classList.add('bg-[#91A287]');
    document.getElementById('vote-2').classList.remove('bg-[#525e4a]');
    document.getElementById('vote-2').style.color = 'black';
    votingFor = null;
});

socket.on('stopVoting', (data) => {
    const room = data.room;
    if (room !== roomCodeDisplay.textContent) return;
    document.querySelectorAll('.vote-button').forEach(button => button.style.display = 'none');
    socket.emit('voteFor', { room: room, vote: votingFor, pair: data.pair });
});

socket.on('updatePoints', (data) => {
    const room = data.room;
    const players = data.players;
    if (room !== roomCodeDisplay.textContent) return;
    for (const player in players) {
        const plr = players[player];
        const plrDiv = document.getElementById(plr.username);
        plrDiv.children[1].textContent = `${plr.points} points`;
    }
});

socket.on('showLeaderboard', (data) => {
    const room = data.room;
    const players = data.players;
    if (room !== roomCodeDisplay.textContent) return;
    document.getElementById('leaderboard-list').innerHTML = '';
    document.getElementById('game').style.display = 'none';
    document.getElementById('leaderboard').style.display = 'flex';
    timer.textContent = "Time's up!";
    Object.values(players).forEach((player) => {
        if (!document.getElementById(player.username)) return;
        const plrDiv = document.createElement('div');
        plrDiv.classList.add('flex', 'items-center', 'justify-between', 'p-[2%]', 'mb-[2%]', 'text-[#6F5840]', 'bg-[#fff0d6]', 'w-[30%]', 'h-[10%]', 'rounded-lg');
        plrDiv.innerHTML = `<span>${player.username}</span><span>${player.points}</span>`;
        document.getElementById(player.username).innerHTML = `<span>${player.username}</span><span>${player.points} points</span>`
        document.getElementById('leaderboard-list').appendChild(plrDiv);
    });
});
