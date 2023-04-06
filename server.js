const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

const mapHeight = Math.random() * 1000 + 500;
const mapWidth = Math.random() * 1000 + 500;

let players = new Map();
let bullets = new Map();
let obstacles = generateRandomObstacles(); 

DAMAGE_DISTANCE = 45;

server.on("connection", (socket) => {
  let playerId = createPlayerId();
  players.set(playerId, {
    id: playerId,
    x: 0,
    y: 0,
    rotation: 0,
    health: 100,
    level: 1,
    kills: 0,
  });

  socket.send(JSON.stringify({ type: "playerId", playerId }));
  socket.send(JSON.stringify({ type: "mapSize", height: mapHeight, width: mapWidth }));

  socket.on("message", (message) => {
    let data = JSON.parse(message);
    switch (data.type) {
      case "update":
        updatePlayer(playerId, data);
        break;
      case "fire":
        addBullet(playerId, data);
        break;
      case "disconnect":
        players.delete(playerId);
        break;
    }
  });

  socket.on("close", () => {
    players.delete(playerId);
  });

  setInterval(() => {
    updateBullets();
    socket.send(
      JSON.stringify({
        type: "update",
        players: Array.from(players.values()),
        bullets: Array.from(bullets.values()),
        obstacles: obstacles,
      })
    );
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
  bullets.set(bulletId, {
    id: bulletId,
    x: data.x,
    y: data.y,
    rotation: data.rotation,
    playerId: playerId,
  });
}

function updateBullets() {
  bullets.forEach((bullet, bulletId) => {
    bullet.x += Math.cos(bullet.rotation) * 3;
    bullet.y += Math.sin(bullet.rotation) * 3;

    players.forEach((player, playerId) => {
      if (playerId !== bullet.playerId) {
        let dx = player.x - bullet.x;
        let dy = player.y - bullet.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < DAMAGE_DISTANCE) {
          // Calculate damage based on the attacker's level
          const attacker = players.get(bullet.playerId);
          const damage = attacker.level * 10;

          player.health -= damage;
          bullets.delete(bulletId);
          console.log(
            `(Bullet hit) Attacker: ${attacker.id}, Victim: ID: ${player.id}, Health Left: ${player.health}`
          );

          if (player.health <= 0) {
            // Level up player, keep track of kills
            attacker.kills++;
            attacker.level++;

            console.log(
              `(Player killed) Attacker: ID: ${attacker.id}, Kills: ${attacker.kills}, Level: ${attacker.level}`
            );
            sendLevelUp(attacker.id, attacker.level);

            // Remove destroyed player
            sendDestroyed(playerId);
            players.delete(playerId);
          }
        }
      }
    });

    if (bullet.x < 0 || bullet.x > mapHeight || bullet.y < 0 || bullet.y > mapWidth) {
      bullets.delete(bulletId);
    }
  });
}

function sendLevelUp(attackerId, attackerLevel) {
  let levelUpData = {
    type: "levelUp",
    playerId: attackerId,
    level: attackerLevel,
  };
  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(levelUpData));
    }
  });
}

function sendDestroyed(playerId) {
  let destroyedData = {
    type: "destroyed",
    playerId: playerId,
  };
  server.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(destroyedData));
    }
  });
}

function generateRandomObstacles() {
  const obstacles = [];

  const obstacleDensity = 0.00001; // Adjust this value to control the number of obstacles per square unit
  const numObstacles = Math.floor(obstacleDensity * mapWidth * mapHeight);

  for (let i = 0; i < numObstacles; i++) {
    const x = Math.random() * (mapWidth - 100);
    const y = Math.random() * (mapHeight - 100);
    const width = 50 + Math.random() * 100;
    const height = 50 + Math.random() * 100;

    obstacles.push({ x, y, width, height });
  }

  return obstacles;
}
