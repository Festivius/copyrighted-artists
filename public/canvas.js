const leftCanvas = document.getElementById('draw-canvas');
const rightCanvas = document.getElementById('view-canvas');
const leftCtx = leftCanvas.getContext('2d');
const rightCtx = rightCanvas.getContext('2d');

const brush = document.getElementById('brush');
const bucket = document.getElementById('fill');
const trash = document.getElementById('clear');
const saveButton = document.getElementById('export');
const color = document.getElementById('color');
const size = document.getElementById('size');

let canvas = leftCanvas;
let ctx = leftCtx;

let mode = 'brush';
let prevX = 0, prevY = 0;

let brushSize = 5;

let currentStroke = null;

let undoStack = [];

let prevLeftWidth = canvas.width;
let prevRightWidth = canvas.width;
let prevLeftHeight = canvas.height;
let prevRightHeight = canvas.height;

let imageDataBackup = null;

let canDraw = true;


canvas.addEventListener('mousedown', (e) => startBrush(e));
canvas.addEventListener('mousemove', (e) => moveBrush(e));
canvas.addEventListener('mouseup', () => endBrush());
canvas.addEventListener('mouseout', () => endBrush());

brush.addEventListener('click', () => selectTool('brush'));
size.addEventListener('input', () => setFont());
color.addEventListener('input', () => setColor());
color.addEventListener('click', () => setColor());
trash.addEventListener('click', () => resetBtn());

window.addEventListener('resize', () => rescale());


reset();


function draw(type, x1, y1, x2, y2, c, s, side='left') {
    if (side === 'left') {
        canvas = leftCanvas;
        ctx = leftCtx;
    } else {
        canvas = rightCanvas;
        ctx = rightCtx;
    }

    const scale = canvas.width / canvas.offsetWidth;
    const coords = [Math.floor(x1 * scale), Math.floor(y1 * scale), Math.floor(x2 * scale), Math.floor(y2 * scale)];

    ctx.strokeStyle = c;
    ctx.lineWidth = s;
    
    ctx.beginPath();

    if (type === 'brush') {
        ctx.moveTo(coords[0], coords[1]);
        ctx.lineTo(coords[2], coords[3]);
    } else if (type === 'dot') {
        ctx.arc(coords[0], coords[1], s/10000000000, 0, 2 * Math.PI);
        ctx.fill();
    } else if (type === 'fill') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const pixel = ctx.getImageData(coords[0], coords[1], 1, 1);
        const [tr, tg, tb] = pixel.data;
        const [fr, fg, fb] = ctx.strokeStyle.replace('#', '').match(/.{2}/g).map(val => parseInt(val, 16));

        if (tr === fr && tg === fg && tb === fb) return;

        const queue = [[coords[0], coords[1]]];
        const visited = new Uint8Array(canvas.width * canvas.height);
        const data = imageData.data;

        function matchColor(x, y) {
            const index = (y * canvas.width + x) * 4;
            const dr = Math.abs(data[index] - tr);
            const dg = Math.abs(data[index + 1] - tg);
            const db = Math.abs(data[index + 2] - tb);
            const tolerance = 12;

            return dr <= tolerance && dg <= tolerance && db <= tolerance;
        }

        while (queue.length) {
            const [currentX, currentY] = queue.pop();
            const index = currentY * canvas.width + currentX;

            if (currentX < 0 || currentX >= canvas.width || currentY < 0 || currentY >= canvas.height || visited[index]) continue;
            visited[index] = 1;

            if (matchColor(currentX, currentY)) {
                queue.push([currentX + 1, currentY], [currentX - 1, currentY], [currentX, currentY + 1], [currentX, currentY - 1]);
            }

            const dataIndex = index * 4;
            data[dataIndex] = fr;
            data[dataIndex + 1] = fg;
            data[dataIndex + 2] = fb;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    ctx.stroke();

    console.log('drown');
}

function startBrush(e) {
    if (!canDraw) return;
    if (mode === 'fill') {
        fill(e);
    } else if (mode === 'brush') {
        currentStroke = { type: 'brush', points: [], color: color.value, size: brushSize };

        currentStroke.points.push({ x: e.offsetX, y: e.offsetY });

        draw('dot', e.offsetX, e.offsetY, null, null, color.value, brushSize);

        socket.emit('draw', { type: 'dot', x1: e.offsetX, y1: e.offsetY, x2: null, y2: null, color: color.value, size: size.value });

        mode = 'brushing';

        [prevX, prevY] = [e.offsetX, e.offsetY];
    }
}

function moveBrush(e) {
    if (!canDraw) return;
    if (!(mode === 'brushing')) return;

    currentStroke.points.push({ x: e.offsetX, y: e.offsetY });

    draw('brush', prevX, prevY, e.offsetX, e.offsetY, color.value, brushSize);

    socket.emit('draw', { type: 'brush', x1: prevX, y1: prevY, x2: e.offsetX, y2: e.offsetY, color: color.value, size: size.value});

    [prevX, prevY] = [e.offsetX, e.offsetY];
}

function endBrush() {
    if (mode === 'brushing') {
        mode = 'brush';

        if (currentStroke) {
            undoStack.push(currentStroke);
            currentStroke = null;
        }
    }
}

function fill(e) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    undoStack.push({ type: 'fill', imageData: imageData });

    draw('fill', e.offsetX, e.offsetY, null, null, color.value, brushSize);

    socket.emit('draw', { type: 'fill', x1: e.offsetX, y1: e.offsetY, x2: null, y2: null, color: color.value, size: size.value });
}

function selectTool(tool) {
    mode = tool;

    const buttons = document.querySelectorAll('.icon');
    buttons.forEach(button => button.classList.remove('active'));

    const selectedButton = document.getElementById(tool);
    selectedButton.classList.add('active');
}

function undo() {
    canvas = leftCanvas;
    ctx = leftCtx;

    if (undoStack.length === 0) return;

    const lastAction = undoStack.pop();

    if (lastAction.type === 'fill') {
        ctx.putImageData(lastAction.imageData, 0, 0);
    } else if (lastAction.type === 'brush') {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        undoStack.forEach(action => {
            if (action.type === 'brush') {
                for (let i = 1; i < action.points.length; i++) {
                    const prev = action.points[i - 1];
                    const current = action.points[i];
                    draw('brush', prev.x, prev.y, current.x, current.y, action.color, action.size, 'left');
                }
            }
        });
    }

    console.log('sent update request');
    socket.emit('updateViewCanvas', { imageData: ctx.getImageData(0, 0, canvas.width, canvas.height).data });
}

function resetBtn() {
    setFont();
    setColor();
    
    canvas = leftCanvas;
    ctx = leftCtx;

    ctx.lineCap = 'round';
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    socket.emit('updateViewCanvas', { imageData: ctx.getImageData(0, 0, canvas.width, canvas.height).data });
}

function setFont() {
    brushSize = size.value;
    ctx.lineWidth = brushSize;
}

function setColor(c=color.value) {
    console.log('setting color:', c);
    color.value = c;
    ctx.strokeStyle = c;
    document.getElementById('color-label').style.backgroundColor = c;
}

function scaleCanvas(side) {
    if (side === 'left') {
        canvas = document.getElementById('draw-canvas');
        ctx = canvas.getContext('2d');
        prevWidth = prevLeftWidth;
        prevHeight = prevLeftHeight;
    } else {
        canvas = document.getElementById('view-canvas');
        ctx = canvas.getContext('2d');
        prevWidth = prevRightWidth;
        prevHeight = prevRightHeight;
    }

    const cssWidth = canvas.width;
    const cssHeight = canvas.height;

    ctx.scale(cssWidth/prevWidth, cssWidth/prevWidth);

    if (side === 'left') {
        prevLeftWidth = cssWidth;
        prevLeftHeight = cssHeight;
    } else {
        prevRightWidth = cssWidth;
        prevRightHeight = cssHeight;
    }
}

function rescale() {
    scaleCanvas('right');
    scaleCanvas('left');
}

function reset() {
    rescale();
    setFont();
    setColor();

    ctx = rightCtx;
    ctx.lineCap = 'round';
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx = leftCtx;
    ctx.lineCap = 'round';
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    socket.emit('resetCanvas');
}


socket.on('connect', () => {
    console.log('connecteddd to server');
});

socket.on('disconnect', () => {
    console.log('disconnenet');
});

socket.on('updateViewCanvas', (data, socketid, players) => {
    if (players[socket.id].partner !== socketid) return;
    canvas = rightCanvas;
    ctx = rightCtx;

    const imageData = new ImageData(new Uint8ClampedArray(data.imageData), canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
});

socket.on('draw', (data, socketid, players) => {
    if (players[socket.id].partner !== socketid) return;
    draw(data.type, data.x1, data.y1, data.x2, data.y2, data.color, data.size, side='right');
});

socket.on('startRound', (data) => {
    if (data.room !== roomCodeDisplay.textContent) return;
    console.log('starting round');
    reset();
    canDraw = true;
});

socket.on('updateTimer', (data) => {
    if (data.room !== roomCodeDisplay.textContent) return;
    if (data.time === 10 && data.players[socket.id].role === 'drawer') canDraw = false;
    if (data.time === 0) canDraw = false;
});

socket.on('requestCanvas', (room) => {
    if (room !== roomCodeDisplay.textContent) return;
    socket.emit('sendCanvas', { imageData: ctx.getImageData(0, 0, canvas.width, canvas.height).data, room: room });
});
