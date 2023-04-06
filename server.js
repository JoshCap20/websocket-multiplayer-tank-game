const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

let players = new Map();
let bullets = new Map();

server.on('connection', (socket) => {
    let playerId = createPlayerId();
    players.set(playerId, { id: playerId, x: 0, y: 0, rotation: 0, health: 100 });

    socket.on('message', (message) => {
        let data = JSON.parse(message);
        switch (data.type) {
            case 'update':
                updatePlayer(playerId, data);
                break;
            case 'fire':
                addBullet(playerId, data);
                break;
            case 'disconnect':
                players.delete(playerId);
                break;
        }
    });

    socket.on('close', () => {
        players.delete(playerId);
    });

    setInterval(() => {
        updateBullets();
        socket.send(JSON.stringify({ type: 'update', players: Array.from(players.values()), bullets: Array.from(bullets.values()) }));
    }, 1000 / 60);
});

function createPlayerId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function updatePlayer(playerId, data) {
    let player = players.get(playerId);
    if (player) {
        player.x = data.x;
        player.y = data.y;
        player.rotation = data.rotation;
    }
}

function addBullet(playerId, data) {
    let bulletId = createPlayerId();
    bullets.set(bulletId, { id: bulletId, x: data.x, y: data.y, rotation: data.rotation, playerId: playerId });
}

function updateBullets() {
    bullets.forEach((bullet, bulletId) => {
        bullet.x += Math.cos(bullet.rotation) * 10;
        bullet.y += Math.sin(bullet.rotation) * 10;

        players.forEach((player, playerId) => {
            if (playerId !== bullet.playerId) {
                let dx = player.x - bullet.x;
                let dy = player.y - bullet.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 20) {
                    player.health -= 15;
                    bullets.delete(bulletId);
                }

                if (player.health <= 0) {
                    players.delete(playerId);
                }
            }
        });

        if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
            bullets.delete(bulletId);
        }
    });
}
