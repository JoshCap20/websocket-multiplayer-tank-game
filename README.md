# Multiplayer Tank Game
A simple, fast-paced, multiplayer tank game built using Node.js and JavaScript that runs in your browser. The game employs the HTML5 Canvas API for smooth and responsive rendering of 2D graphics and utilizes WebSockets to establish real-time communication between clients and the server. 

<img width="746" alt="Screenshot 2023-04-06 at 5 17 51 AM" src="https://user-images.githubusercontent.com/97563979/230335392-631934b2-366a-4377-b1e5-f56a3a3a0a7d.png">

## Features
- Real-time multiplayer gameplay
- Tank movement and rotation
- Firing bullets with damage and cooldown
- Health bars and tank destruction
- Leveling up system
- Randomly generated maps with obstacles and spawning

### To Be Added
- Tank upgrade selections
- Tank types (light, medium, heavy)

### Bugs
- Incorrectly painted out of bounds on some size browsers

## Installation
1. Clone the repository:
   ```bash  
   git clone https://github.com/JoshCap20/websocket-world-of-tanks```

2. Change directory to the project folder:
    ```cd websocket-world-of-tanks```

3. Install the dependencies:
    ```npm install```

## Running the game (Server)
Start the WebSocket and HTTP server:  
    ```npm start```


## Playing the game (Client)
The server will give you the address that anyone on the same network can use to play with you, that is your IP address on the network + the port of the server.

This game is configured to run on port 8080 by default.

## Controls
- Arrow Up: Move forward
- Arrow Down: Move backward
- Arrow Left: Rotate left
- Arrow Right: Rotate right
- Space: Fire bullet
