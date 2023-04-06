const socket = new WebSocket('ws://localhost:8080');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let players = [];
let bullets = [];

// Tank model
class Tank {
    constructor(x, y, rotation) {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.lastFired = 0;
        this.cooldown = 500; // Cooldown time in milliseconds
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

    canFire() {
        return Date.now() - this.lastFired >= this.cooldown;
    }

    fire() {
        if (!this.canFire()) {
            return;
        }
        this.lastFired = Date.now();
        let data = {
            type: 'fire',
            x: this.x + Math.cos(this.rotation) * 35,
            y: this.y + Math.sin(this.rotation) * 35,
            rotation: this.rotation,
        };
        socket.send(JSON.stringify(data));
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
        case ' ':
            localTank.fire();
            break;
    }
});

socket.onmessage = (event) => {
    let data = JSON.parse(event.data);
    switch (data.type) {
        case 'update':
            players = data.players;
            bullets = data.bullets;
            break;
        case 'destroyed':
            displayDestroyedMessage();
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
        drawHealthBar(player);
    });

    bullets.forEach((bullet) => {
        drawBullet(bullet.x, bullet.y);
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

function drawHealthBar(player) {
    const width = 40;
    const height = 5;
    const x = player.x - width / 2;
    const y = player.y - 20;

    ctx.fillStyle = 'red';
    ctx.fillRect(x, y, width, height);

    const healthWidth = (width * player.health) / 100;
    ctx.fillStyle = 'green';
    ctx.fillRect(x, y, healthWidth, height);
}

function drawBullet(x, y) {
    ctx.save();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function displayDestroyedMessage() {
    const messageElement = document.createElement('div');
    messageElement.style.position = 'fixed';
    messageElement.style.top = '50%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.fontSize = '24px';
    messageElement.style.fontWeight = 'bold';
    messageElement.style.color = 'red';
    messageElement.innerText = 'Your tank was destroyed!';

    document.body.appendChild(messageElement);

    setTimeout(() => {
        document.body.removeChild(messageElement);
    }, 3000);
}
       