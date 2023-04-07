const WebSocket = require("ws");
const http = require("http");
const express = require("express");
const path = require("path");

const app = express();

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

const mapHeight = Math.random() * 1000 + 1000;
const mapWidth = Math.random() * 1000 + 1000;

let players = new Map();
let bullets = new Map();
let aiTanks = new Map();
let obstacles = generateRandomObstacles(); 
createAiTank();

wss.on("connection", (ws) => {
  let playerId = createPlayerId();
  let spawnPoint = getRandomSpawnPoint();
  players.set(playerId, {
    id: playerId,
    x: spawnPoint.x,
    y: spawnPoint.y,
    height: 40,
    width: 20,
    rotation: 0,
    health: 100,
    level: 1,
    kills: 0,
    active: false,
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
      case "activatePlayer": 
        activatePlayer(playerId);
        break;
    }
  });

  ws.on("close", () => {
    players.delete(playerId);
  });

  setInterval(() => {
    updateBullets();
    updateAiTanks();
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

    if (collidesWithObstacle(bullet.x, bullet.y, 1, 1)) {
      bullets.delete(bulletId);
    }

    players.forEach((player, playerId) => {
      if (playerId !== bullet.playerId && player.active) {
        // use player.height and player.width 
        // instead of hard coded values
        if (
          bullet.x > player.x - player.width &&
          bullet.x < player.x + player.width &&
          bullet.y > player.y - player.height &&
          bullet.y < player.y + player.height
        ) {

        // let dx = player.x - bullet.x;
        // let dy = player.y - bullet.y;
        // let distance = Math.sqrt(dx * dx + dy * dy);

        // if (distance < 15) {
          // Calculate damage based on the attacker's level up to 20 a shot
          const attacker = players.get(bullet.playerId);
          if (attacker == null || attacker == undefined) {
            player.health -= 5;
            bullets.delete(bulletId);
            if (player.health <= 0) {
              // Remove destroyed player
              sendDestroyed(playerId);
              players.delete(playerId);
            }
            return;
          } 
          const damage = Math.min(5 + (attacker.level - 1) / 2, 20);

          player.health -= damage;
          bullets.delete(bulletId);

          if (player.health <= 0) {
            // Level up player, keep track of kills
            attacker.kills++;
            attacker.level++;
            if (attacker.health >= 50) {
              attacker.health = 100;
            } else {
              attacker.health+=50;
            }
            

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

    aiTanks.forEach((ai) => {
      if (bullet.playerId !== ai.id) { // Check if the bullet is not from the same AI
        let dx = ai.x - bullet.x;
        let dy = ai.y - bullet.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
  
        if (distance < 20) {
          const attacker = players.get(bullet.playerId);
          if (attacker == null || attacker == undefined) {
            ai.health -= 5;
            bullets.delete(bulletId);
            if (ai.health <= 0) {
              // Remove destroyed AI
              aiTanks.delete(ai.id);
              players.delete(ai.id);
            }
            return;
          } 
          const damage = Math.min(5 + (attacker.level - 1) / 2, 20); // Calculate damage based on the attacker's level
          ai.health -= damage;
          bullets.delete(bulletId);
          if (ai.health <= 0 ) {
            // Level up player, keep track of kills
            attacker.kills++;
            attacker.level++;
            if (attacker.health <= 50) {
              attacker.health += 50;
            } else {
              attacker.health = 100;
            }

            console.log(
              `(Player killed) Attacker: ID: ${attacker.id}, Kills: ${attacker.kills}, Level: ${attacker.level}`
            );
            sendLevelUp(attacker.id, attacker.level);

            // Remove destroyed AI
            aiTanks.delete(ai.id);
            players.delete(ai.id);

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

function activatePlayer(playerId) {
  let player = players.get(playerId);
  if (player) {
    player.active = true;
  }
}

function createAiTank() {
  let spawnPoint = getRandomSpawnPoint();
  let aiTank = {
    id: `ai-${createPlayerId()}`,
    x: spawnPoint.x,
    y: spawnPoint.y,
    rotation: 0,
    health: 100,
    level: 1 + Math.floor(Math.random() * 3),
    kills: 0,
    isAi: true,
    lastShot: Date.now(),
  };
  players.set(aiTank.id, aiTank);
  aiTanks.set(aiTank.id, aiTank);
}

function updateAiTanks() {
  aiTanks.forEach((aiTank) => {
    if (aiTank.health <= 0) return;
    let closestPlayer = null;
    let closestDistance = Infinity;

    players.forEach((player) => {
      if (player.id !== aiTank.id && !player.isAi && player.active) {
        let dx = player.x - aiTank.x;
        let dy = player.y - aiTank.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestPlayer = player;
        }
      }
    });

    if (closestPlayer) {
      let angleToPlayer = Math.atan2(closestPlayer.y - aiTank.y, closestPlayer.x - aiTank.x);
      aiTank.rotation = angleToPlayer;

      if (closestDistance > 30) {
        let angleToPlayer = Math.atan2(closestPlayer.y - aiTank.y, closestPlayer.x - aiTank.x);
        let desiredX = Math.cos(angleToPlayer) * 1;
        let desiredY = Math.sin(angleToPlayer) * 1;
      
        let avoid = avoidObstacles(aiTank.x, aiTank.y);
      
        let newX = aiTank.x + desiredX + avoid.x;
        let newY = aiTank.y + desiredY + avoid.y;
      
        if (!collidesWithObstacle(newX, newY, 30, 30)) {
          aiTank.x = newX;
          aiTank.y = newY;
        }
      }

      // If aiTank.lastShot was more than 2 seconds ago
      if (aiTank.lastShot + 2000 < Date.now()) {
        // Make the AI tank fire
        const bullets = aiTank.level >= 3 ? 2 : 1;
        const offsets = bullets == 2 ? [-2, 3] : [0];
        for (let offset of offsets) {
          for (let i = 0; i < bullets; i++) {
            let data = {
              x: aiTank.x + offset + Math.cos(aiTank.rotation),
              y: aiTank.y + offset + Math.sin(aiTank.rotation),
              rotation: aiTank.rotation,
            };
            addBullet(aiTank.id, data);
          }
        }
        aiTank.lastShot = Date.now();
      }

    }
  });
}


function sendLevelUp(attackerId, attackerLevel) {
  // get player and adjust their heigth and width
  let player = players.get(attackerId);
  player.width = 40 + (player.level * 3);

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
    const x = Math.random() * (mapWidth - 10);
    const y = Math.random() * (mapHeight - 10);
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
    x = Math.random() * (mapWidth - 100) + 50;
    y = Math.random() * (mapHeight - 100) + 50;

    if (!collidesWithObstacle(x, y, 60, 50)) {
      validSpawn = true;
    }
  }

  return { x, y };
}

function avoidObstacles(x, y) {
  const detectionRadius = 100;
  const avoidStrength = 2;
  let steerX = 0;
  let steerY = 0;

  obstacles.forEach((obstacle) => {
    const dx = x - (obstacle.x + obstacle.width / 2);
    const dy = y - (obstacle.y + obstacle.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < detectionRadius) {
      const weight = (detectionRadius - distance) / detectionRadius;
      steerX += dx / distance * weight;
      steerY += dy / distance * weight;
    }
  });

  return {
    x: steerX * avoidStrength,
    y: steerY * avoidStrength,
  };
}

// Listen on port 8080 for both HTTP and WebSocket
server.listen(8080, () => {
  console.log("Server listening on port 8080, connect to play");
  require('dns').lookup(require('os').hostname(), function (err, add, fam) {
    console.log('Play with anyone on your network: ' + add + ':8080');
  })
});

// +1 health every 3 seconds
setInterval(() => {
  players.forEach((player) => {
    player.health = Math.min(player.health + 1, 100);
  });
  if (players.size + aiTanks.size < 3) {
    createAiTank();
  }
}
, 3000);