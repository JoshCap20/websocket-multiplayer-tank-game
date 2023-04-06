# Multiplayer Tank Game
A simple, fast-paced, multiplayer tank game built using Node.js and JavaScript that runs in your browser. The game employs the HTML5 Canvas API for smooth and responsive rendering of 2D graphics and utilizes WebSockets to establish real-time communication between clients and the server. 

## Features
- Real-time multiplayer gameplay
- Tank movement and rotation
- Firing bullets with damage and cooldown
- Health bars and tank destruction
- Leveling up system
- Randomly generated maps with obstacles and spawning

### To Be Added:
- Tank upgrade selections
- Tank types (light, medium, heavy)
- Out of bounds warning

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
- Arrow Down: Move backward
- Arrow Left: Rotate left
- Arrow Right: Rotate right
- Space: Fire bullet
