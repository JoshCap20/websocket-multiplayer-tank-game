const socket = new WebSocket("ws://localhost:8080");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let mapWidth, mapHeight;

let players = [];
let bullets = [];
let obstacles = [];

let __health = 100;

const viewportWidth = 800;
const viewportHeight = 600;

// Tank model
class Tank {
  constructor(x, y, rotation) {
    this.id = 0;
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.lastFired = 0;
    this.cooldown = 500; // Cooldown time in milliseconds
    this.level = 1;
    this.died = false;
  }

  moveForward() {
    const newX = this.x + Math.cos(this.rotation) * 3 * this.level;
    const newY = this.y + Math.sin(this.rotation) * 3 * this.level;

    if (!collidesWithObstacle(newX, newY, 40, 20) &&
        newX >= 20 && newX <= mapWidth - 20 &&
        newY >= 20 && newY <= mapHeight - 20) {
      this.x = newX;
      this.y = newY;
    }
  }

  moveBackward() {
    const newX = this.x - Math.cos(this.rotation) * 1.5;
    const newY = this.y - Math.sin(this.rotation) * 1.5;

    if (!collidesWithObstacle(newX, newY, 40, 20) &&
        newX >= 20 && newX <= mapWidth - 20 &&
        newY >= 20 && newY <= mapHeight - 20) {
      this.x = newX;
      this.y = newY;
    }
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
    if (!this.canFire() || this.died) {
      return;
    }
    this.lastFired = Date.now();
    let data = {
      type: "fire",
      x: this.x + Math.cos(this.rotation),
      y: this.y + Math.sin(this.rotation),
      rotation: this.rotation,
    };
    socket.send(JSON.stringify(data));
  }
}

// Local tank
const localTank = new Tank(canvas.width / 2, canvas.height / 2, 0);

// Input handling
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      localTank.moveForward();
      break;
    case "ArrowLeft":
      localTank.rotateLeft();
      break;
    case "ArrowRight":
      localTank.rotateRight();
      break;
    case "ArrowDown":
      localTank.moveBackward();
      break;
    case " ":
      localTank.fire();
      break;
  }
});

socket.onmessage = (event) => {
  let data = JSON.parse(event.data);
  switch (data.type) {
    case "update":
      players = data.players;
      bullets = data.bullets;
      obstacles = data.obstacles;
      break;
    case "destroyed":
      if (data.playerId === localTank.id) {
        displayDestroyedMessage();
        updateHealth(0);
      }
      break;
    case "levelUp":
      if (data.playerId === localTank.id) {
        levelUp();
      }
      break;
    case "playerId":
      localTank.id = data.playerId;
      break;
    case "mapSize":
      mapWidth = data.width;
      mapHeight = data.height;
  }
};

socket.onopen = () => {
  gameLoop();
};

function update() {
  let data = {
    type: "update",
    x: localTank.x,
    y: localTank.y,
    rotation: localTank.rotation,
  };
  socket.send(JSON.stringify(data));
}

function draw() {
  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

  const currentPlayer = players.find((player) => player.id === localTank.id);
  if (!currentPlayer) return;

  const offsetX = Math.min(Math.max(currentPlayer.x - viewportWidth / 2, 0), mapWidth - viewportWidth);
  const offsetY = Math.min(Math.max(currentPlayer.y - viewportHeight / 2, 0), mapHeight - viewportHeight);

  ctx.save();
  ctx.translate(-offsetX, -offsetY);

  drawOutOfBounds(offsetX, offsetY);

  players.forEach((player) => {
    drawTank(player.x, player.y, player.rotation);
    drawHealthBar(player);
  });

  bullets.forEach((bullet) => {
    drawBullet(bullet.x, bullet.y);
  });

  obstacles.forEach((obstacle) => {
    drawObstacle(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });

  ctx.restore();
}

function drawTank(x, y, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Draw the body of the tank
  ctx.fillStyle = "green";
  ctx.fillRect(-20, -10, 40, 20);

  // Draw the gun of the tank
  ctx.fillStyle = "gray";
  ctx.fillRect(20, -3, 15, 6);

  ctx.restore();
}

function drawObstacle(x, y, width, height) {
  ctx.fillStyle = "brown";
  ctx.fillRect(x, y, width, height);
}

function drawBullet(x, y) {
  ctx.save();
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

function drawHealthBar(player) {
  const width = 40;
  const height = 5;
  const x = player.x - width / 2;
  const y = player.y - 20;

  ctx.fillStyle = "red";
  ctx.fillRect(x, y, width, height);

  const healthWidth = (width * player.health) / 100;
  ctx.fillStyle = "green";
  ctx.fillRect(x, y, healthWidth, height);

  if (player.id === localTank.id && player.health != __health) {
    updateHealth(player.health);
  }
}

function drawOutOfBounds(offsetX, offsetY) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

  // Draw top, bottom, left, and right out-of-bounds areas
  ctx.fillRect(offsetX, offsetY, mapWidth, Math.max(0, viewportHeight / 2 - mapHeight / 2));
  ctx.fillRect(offsetX, offsetY + mapHeight - Math.max(0, viewportHeight / 2 - mapHeight / 2), mapWidth, Math.max(0, viewportHeight / 2 - mapHeight / 2));
  ctx.fillRect(offsetX, offsetY, Math.max(0, viewportWidth / 2 - mapWidth / 2), mapHeight);
  ctx.fillRect(offsetX + mapWidth - Math.max(0, viewportWidth / 2 - mapWidth / 2), offsetY, Math.max(0, viewportWidth / 2 - mapWidth / 2), mapHeight);
}

function collidesWithObstacle(x, y, width, height) {
  for (const obstacle of obstacles) {
    if (
      x + width / 2 > obstacle.x &&
      x - width / 2 < obstacle.x + obstacle.width &&
      y + height / 2 > obstacle.y &&
      y - height / 2 < obstacle.y + obstacle.height
    ) {
      return true;
    }
  }
  return false;
}


function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function displayDestroyedMessage() {
  localTank.died = true;
  const messageElement = document.createElement("div");
  messageElement.style.position = "fixed";
  messageElement.style.top = "50%";
  messageElement.style.left = "50%";
  messageElement.style.transform = "translate(-50%, -50%)";
  messageElement.style.fontSize = "24px";
  messageElement.style.fontWeight = "bold";
  messageElement.style.color = "red";
  messageElement.innerText = "Your tank was destroyed!";

  document.body.appendChild(messageElement);
}

function levelUp() {
  localTank.level++;

  const levelElement = document.getElementById("level");
  levelElement.innerText = localTank.level;

  const killsElement = document.getElementById("kills");
  killsElement.innerText = localTank.level - 1;
}

function updateHealth(health) {
    const healthElement = document.getElementById("health");
    healthElement.innerText = health;

    __health = health;
}