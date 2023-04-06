const socket = new WebSocket('ws://localhost:8080');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let players = [];

// Tank model
class Tank {
    constructor(x, y, rotation) {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
    }

    moveForward() {
        this.x += Math.cos(this.rotation) * 5;
        this.y += Math.sin(this.rotation) * 5;
    }

    rotateLeft() {
        this.rotation -= 0.05;
    }

    rotateRight() {
        this.rotation += 0.05;
    }
}

// Local tank
const localTank = new Tank(canvas.width / 2, canvas.height / 2, 0);

// Input handling
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            localTank.moveForward();
            break;
        case 'ArrowLeft':
            localTank.rotateLeft();
            break;
        case 'ArrowRight':
            localTank.rotateRight();
            break;
    }
});

socket.onmessage = (event) => {
    let data = JSON.parse(event.data);
    switch (data.type) {
        case 'update':
            players = data.players;
            break;
    }
};

socket.onopen = () => {
    gameLoop();
};

function update() {
    let data = {
        type: 'update',
        x: localTank.x,
        y: localTank.y,
        rotation: localTank.rotation,
    };
    socket.send(JSON.stringify(data));
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    players.forEach((player) => {
        drawTank(player.x, player.y, player.rotation);
    });
}

function drawTank(x, y, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Draw the body of the tank
    ctx.fillStyle = 'green';
    ctx.fillRect(-20, -10, 40, 20);

    // Draw the gun of the tank
    ctx.fillStyle = 'gray';
    ctx.fillRect(20, -3, 15, 6);

    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
