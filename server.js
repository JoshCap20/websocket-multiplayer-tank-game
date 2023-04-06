const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8080 });

let players = new Map();

server.on('connection', (socket) => {
    console.log("New connection");
    let playerId = createPlayerId();
    players.set(playerId, { id: playerId, x: 0, y: 0, rotation: 0 });

    socket.on('message', (message) => {
        let data = JSON.parse(message);
        switch (data.type) {
            case 'update':
                updatePlayer(playerId, data);
                break;
            case 'disconnect':
                players.delete(playerId);
                break;
        }
    });

    socket.on('close', () => {
        players.delete(playerId);
        console.log("Connection closed");
    });

    setInterval(() => {
        socket.send(JSON.stringify({ type: 'update', players: Array.from(players.values()) }));
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
