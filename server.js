const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {

  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    }

    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /
    if (req.method === 'GET' && req.url === '/') {
      const htmlPage = fs.readFileSync('./views/new-player.html', 'utf-8');
      const availableRooms = world.availableRoomsToString();
      const resBody = htmlPage.replace(/#{availableRooms}/g, `${availableRooms}`);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      return res.end(resBody);
    }

    // Phase 2: POST /player
    if (req.method === 'POST' && req.url === ('/player')) {
      const roomID = req.body.roomId;
      const playerName = req.body.name;
      const currentRoom = world.rooms[roomID];

      player = new Player(playerName, currentRoom);

      res.statusCode = 302;
      res.setHeader('Location', `/rooms/${roomID}`);
      return res.end();
    }

    // Phase 3: GET /rooms/:roomId
    if (req.method === 'GET' && req.url.startsWith('/rooms/')) {
      const urlSplit = req.url.split('/');
      const roomID = urlSplit[2];

      // redirect if player not in room
      if (player.currentRoom.id !== Number(roomID)) {
        res.statusCode = 302;
        res.setHeader('Location', `/rooms/${player.currentRoom.id}`);
        return res.end();
      }

      if (urlSplit.length === 3) {
        const htmlPage = fs.readFileSync('./views/room.html', 'utf-8');
        const room = world.rooms[roomID];

        const resBody = htmlPage
          .replace(/#{roomName}/g, `${room.name}`)
          .replace(/#{roomId}/g, `${room.id}`)
          .replace(/#{roomItems}/g, `${room.itemsToString()}`)
          .replace(/#{exits}/g, `${room.exitsToString()}`)
          .replace(/#{inventory}/g, `${player.inventoryToString()}`);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        return res.end(resBody);
      }

      // Phase 4: GET /rooms/:roomId/:direction
      if (urlSplit.length === 4) {
        const direction = urlSplit[3];

        try {
          player.move(direction[0]);
          res.statusCode = 302;
          res.setHeader('Location', `/rooms/${player.currentRoom.id}`);
          return res.end();
        } catch (e) {
          res.statusCode = 302;
          res.setHeader('Location', `/rooms/${roomID}`);
          return res.end();
        }
      }
    }

    // Phase 5: POST /items/:itemId/:action

    // Phase 6: Redirect if no matching route handlers
  })
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));
