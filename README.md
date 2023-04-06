# Multiplayer Tank Game
A simple multiplayer tank game built using Node.JS, JavaScript, Canvas, and WebSockets.

## Features
- Real-time multiplayer gameplay
- Tank movement and rotation
- Firing bullets with damage and cooldown
- Health bars and tank destruction
- Leveling up system

### To Be Added:
- Obstacles
- Tank upgrade selections
- Tank types (light, medium, heavy)

## Installation
1. Clone the repository:
   ```bash  
   git clone https://github.com/JoshCap20/websocket-world-of-tanks```

2. Change directory to the project folder:
    ```cd websocket-world-of-tanks```

3. Install the dependencies:
    ```npm install```

## Running the game (Server)
1. Start the WebSocket server:  
    ```npm start```

2. In another terminal, start the HTTP server:  
    ```npm run serve```

## Playing the game (Client)
Open your browser and go to http://localhost:8081 to play the game (or whatever port the http server is on).

## Controls
- Arrow Up: Move forward
- Arrow Left: Rotate left
- Arrow Right: Rotate right
- Space: Fire bullet
