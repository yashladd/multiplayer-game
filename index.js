const http = require('http');
const app = require('express')();
app.listen(9091, () => console.log('Listening on 9091'));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
const websocketServer = require('websocket').server;
const httpServer = http.createServer();
httpServer.listen(9090, () => console.log('Listening on ... 9090'));

//Client info
const clients = {};
const games = {};
const wsServer = new websocketServer({
  httpServer: httpServer,
});

wsServer.on('request', request => {
  const connection = request.accept(null, request.origin);
  connection.on('open', () => console.log('Opened!'));
  connection.on('close', () => console.log('closeed!'));
  connection.on('message', message => {
    const result = JSON.parse(message.utf8Data);
    //Recieved a message from the client

    //New game from user
    if (result.method === 'create') {
      const clientId = result.clientId;
      const gameId = guid();
      games[gameId] = {
        id: gameId,
        balls: 20,
        clients: [],
      };

      const payload = {
        method: 'create',
        game: games[gameId],
      };

      const conn = clients[clientId].connection;
      conn.send(JSON.stringify(payload));
    }

    if (result.method === 'join') {
      const clientId = result.clientId;
      const gameId = result.gameId;
      const game = games[gameId];
      if (game.clients.length >= 3) {
        // max players reached
        return;
      }
      const color = { '0': 'Red', '1': 'Green', '2': 'Blue' }[
        game.clients.length
      ];
      game.clients.push({
        clientId: clientId,
        color: color,
      });

      if (game.clients.length === 3) updateGameState();

      const payload = {
        method: 'join',
        game: game,
      };

      //loop thru client and tell them people joined
      game.clients.forEach(c => {
        clients[c.clientId].connection.send(JSON.stringify(payload));
      });
    }

    // A USER plays
    if (result.method === 'play') {
      const clientId = result.clientId;
      const gameId = result.gameId;
      const ballId = result.ballId;
      const color = result.color;
      let state = games[gameId].state;
      if (!state) state = {};

      state[ballId] = color;
      games[gameId].state = state;
    }
  });

  //generate a new clientId
  const clientId = guid();
  clients[clientId] = {
    connection: connection,
  };

  const payload = {
    method: 'connect',
    clientId: clientId,
  };
  //send back client connect
  connection.send(JSON.stringify(payload));
});

function updateGameState() {
  for (const g of Object.keys(games)) {
    const game = games[g];
    const paylaod = {
      method: 'update',
      game: game,
    };
    games[g].clients.forEach(c => {
      clients[c.clientId].connection.send(JSON.stringify(paylaod));
    });
  }

  setTimeout(updateGameState, 500);
}

const guid = () => {
  const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
};
