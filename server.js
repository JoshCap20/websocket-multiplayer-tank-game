const WebSocket = require("ws");
const http = require("http");
const express = require("express");
const path = require("path");

const app = express();

app.set('port', 8080);

const errorHandler = error => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  switch (error.code) {
    case 'EADDRINUSE':
      console.error('port: 8080 is already in use.');
      process.exit(1);
      break;
    default:
      throw error;
  }
};

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
server.on('error', errorHandler);

const wss = new WebSocket.Server({ server });

const mapHeight = Math.random() * 1000 + 500;
const mapWidth = Math.random() * 1000 + 500;

let players = new Map();
let bullets = new Map();
let obstacles = generateRandomObstacles(); 

DAMAGE_DISTANCE = 45;

wss.on("connection", (ws) => {
  let playerId = createPlayerId();
  let spawnPoint = getRandomSpawnPoint();
  players.set(playerId, {
    id: playerId,
    x: spawnPoint.x,
    y: spawnPoint.y,
    rotation: 0,
    health: 100,
    level: 1,
    kills: 0,
  });

  ws.send(JSON.stringify({ type: "playerId", playerId, startX: spawnPoint.x, startY: spawnPoint.y }));
  ws.send(JSON.stringify({ type: "mapSize", height: mapHeight, width: mapWidth }));

  ws.on("message", (message) => {
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

  ws.on("close", () => {
    players.delete(playerId);
  });

  setInterval(() => {
    updateBullets();
    ws.send(
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
    time: Date.now(), // temporary fix for deleting missed bullets
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
            attacker.health+=40;

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

    if (bullet.time + 3700 < Date.now()) {
      bullets.delete(bulletId);
    }

    // need to debug why this is not working
    // if (bullet.x < 0 || bullet.x > mapHeight || bullet.y < 0 || bullet.y > mapWidth) {
    //   bullets.delete(bulletId);
    // }
  });
}

function sendLevelUp(attackerId, attackerLevel) {
  let levelUpData = {
    type: "levelUp",
    playerId: attackerId,
    level: attackerLevel,
  };
  wss.clients.forEach((client) => {
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
  wss.clients.forEach((client) => {
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

function collidesWithObstacle(x, y, width, height) {
  for (let obstacle of obstacles) {
    if (
      x < obstacle.x + obstacle.width &&
      x + width > obstacle.x &&
      y < obstacle.y + obstacle.height &&
      y + height > obstacle.y
    ) {
      return true;
    }
  }
  return false;
}

function getRandomSpawnPoint() {
  let x, y;
  let validSpawn = false;

  while (!validSpawn) {
    x = Math.random() * (mapWidth - 40) + 20;
    y = Math.random() * (mapHeight - 40) + 20;

    if (!collidesWithObstacle(x, y, 40, 20)) {
      validSpawn = true;
    }
  }

  return { x, y };
}

// Listen on port 8080 for both HTTP and WebSocket
server.listen(8080, () => {
  console.log("Server listening on port 8080, connect to play");
  require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    console.log('Play with anyone on your network: ' + add + ':8080');
  })
});

// +2 health every 6 seconds
setInterval(() => {
  players.forEach((player) => {
    player.health = Math.min(player.health + 2, 100);
  });
}
, 6000);