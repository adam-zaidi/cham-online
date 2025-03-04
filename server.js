const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
// Serve static files from the "public" folder (for CSS, images, etc.)
app.use(express.static('public'));

// In-memory storage for games
let games = {};

// Utility function to generate a unique 4-letter game code.
function generateGameCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (games[code]);
  return code;
}

// Homepage: Options to create or join a game.
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Chameleon Online</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h1>Chameleon Online</h1>
    <div class="section">
      <h2>Start a New Game</h2>
      <form action="/create" method="POST">
        <button type="submit">Create New Game</button>
      </form>
    </div>
    <div class="section">
      <h2>Join an Existing Game</h2>
      <form action="/join" method="POST">
        <label for="code">Game Code:</label>
        <input type="text" id="code" name="code" required>
        <label for="name">Display Name:</label>
        <input type="text" id="name" name="name" required>
        <button type="submit">Join Game</button>
      </form>
    </div>
    <div class="instructions">
    <h3>How to Play</h3>
    <ol>
      <li><strong>Create or Join:</strong> The host creates a game and shares the code. Players join by entering the game code and choosing a display name.</li>
      <li><strong>Setup the Round:</strong> The host enters a secret word and a category, then designates the chameleon(s) either manually or randomly.</li>
      <li><strong>Role Assignment:</strong> Non-chameleon players see the secret word and category, while chameleons only see the category along with a special message.</li>
      <li><strong>Gameplay:</strong> Each player gives a hint related to the secret word. The chameleon must bluff by giving a vague hint.</li>
      <li><strong>Discussion & Voting:</strong> After hints are given, players discuss and vote on who they think the chameleon is.</li>
      <li><strong>New Round or End Game:</strong> The host can start a new round with the same players or end the game altogether.</li>
    </ol>
</div>
  </div>
</body>
</html>`);
});

// Create a new game (host).
app.post('/create', (req, res) => {
  const code = generateGameCode();
  games[code] = {
    code: code,
    players: {},
    roundActive: false,
    secret: '',
    category: ''
  };
  res.redirect(`/host/${code}`);
});

// Join a game.
app.post('/join', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const name = req.body.name;
  if (!code || !games[code]) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Game Not Found</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h2>Game code "${code}" not found.</h2>
    <p><a href="/">Back to Home</a></p>
  </div>
</body>
</html>`);
  }
  if (Object.keys(games[code].players).length >= 20) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Game Full</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h2>Game ${code} is full (maximum 20 players).</h2>
    <p><a href="/">Back to Home</a></p>
  </div>
</body>
</html>`);
  }
  if (games[code].roundActive) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Round in Progress</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h2>Game ${code} is already in progress. Please wait for the next round to join.</h2>
    <p><a href="/">Back to Home</a></p>
  </div>
</body>
</html>`);
  }
  let playerId;
  do {
    playerId = Math.random().toString(36).substr(2, 6);
  } while (games[code].players[playerId]);
  games[code].players[playerId] = { name: name, isChameleon: false };
  res.redirect(`/game/${code}/player/${playerId}`);
});

// Host Lobby: Display game info and player list.
app.get('/host/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const game = games[code];
  if (!game) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Game Not Found</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h2>Game ${code} not found or ended.</h2>
    <p><a href="/">Back to Home</a></p>
  </div>
</body>
</html>`);
  }
  let playerListHtml;
  const players = Object.values(game.players);
  if (players.length === 0) {
    playerListHtml = '<p>No players have joined yet.</p>';
  } else {
    playerListHtml = '<ul>' + players.map(p => `<li>${p.name}</li>`).join('') + '</ul>';
  }
  if (!game.roundActive) {
    let checkboxList = '';
    for (const pid in game.players) {
      if (game.players.hasOwnProperty(pid)) {
        const playerName = game.players[pid].name;
        checkboxList += `<label><input type="checkbox" name="chameleon" value="${pid}"> ${playerName}</label><br/>`;
      }
    }
    if (!checkboxList) {
      checkboxList = '<p>(No players yet)</p>';
    }
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Game ${code} - Host Lobby</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h1>Game Code: ${code}</h1>
    <h2>Players Joined:</h2>
    ${playerListHtml}
    <hr>
    <h3>Start a New Round</h3>
    <form action="/startRound" method="POST">
      <input type="hidden" name="code" value="${code}">
      <p>
        <label>Category:</label>
        <input type="text" name="category" required>
      </p>
      <p>
        <label>Secret Word:</label>
        <input type="text" name="secret" required>
      </p>
      <p><strong>Select Chameleon(s):</strong></p>
      ${checkboxList}
      <p><em>— OR — assign chameleons randomly:</em></p>
      <p>
        <label>Number of Chameleons:</label>
        <input type="number" name="randomCount" min="1" max="${Math.max(1, players.length - 1)}">
      </p>
      <button type="submit">Start Round</button>
    </form>
    <p><a href="/host/${code}">🔄 Refresh player list</a></p>
    <form action="/endGame" method="POST" style="margin-top:10px;">
      <input type="hidden" name="code" value="${code}">
      <button type="submit">End Game</button>
    </form>
  </div>
</body>
</html>`);
  } else {
    const chameleonNames = Object.values(game.players)
      .filter(p => p.isChameleon)
      .map(p => p.name);
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Game ${code} - Round Active</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h1>Game Code: ${code}</h1>
    <h2>Category: ${game.category}</h2>
    <h2>Secret Word: ${game.secret}</h2>
    <p><strong>Chameleon(s):</strong> ${chameleonNames.length ? chameleonNames.join(', ') : 'None'}</p>
    <p>The round is now in progress. Have players give their hints!</p>
    <hr>
    <form action="/newRound" method="POST">
      <input type="hidden" name="code" value="${code}">
      <button type="submit">Start New Round</button>
    </form>
    <form action="/endGame" method="POST" style="margin-top:10px;">
      <input type="hidden" name="code" value="${code}">
      <button type="submit">End Game</button>
    </form>
  </div>
</body>
</html>`);
  }
});

// Player page: Show role or waiting state.
app.get('/game/:code/player/:playerId', (req, res) => {
  const code = req.params.code.toUpperCase();
  const playerId = req.params.playerId;
  const game = games[code];
  if (!game) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Game Not Found</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h2>Game ${code} not found or has ended.</h2>
    <p><a href="/">Back to Home</a></p>
  </div>
</body>
</html>`);
  }
  const player = game.players[playerId];
  if (!player) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Player Not Found</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h2>Player not found in game ${code}.</h2>
    <p><a href="/">Back to Home</a></p>
  </div>
</body>
</html>`);
  }
  if (!game.roundActive) {
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Game ${code} - Waiting</title>
  <link rel="stylesheet" href="/style.css">
  <meta http-equiv="refresh" content="5">
</head>
<body>
  <div class="container">
    <h1>Game ${code}</h1>
    <p>Hello <strong>${player.name}</strong>, you've joined the game.</p>
    <h2>Waiting for the host to start the round...</h2>
    <p>Current players:</p>
    <ul>${Object.values(game.players).map(p => `<li>${p.name}</li>`).join('')}</ul>
    <p><em>(This page will auto-refresh every 5 seconds.)</em></p>
  </div>
</body>
</html>`);
  } else {
    if (player.isChameleon) {
      res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Game ${code} - Your Role</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h1>Game ${code}</h1>
    <h2>Category: ${game.category}</h2>
    <h2>You are the <span class="chameleon">Chameleon</span>!</h2>
    <p>You do <strong>not</strong> know the secret word. Listen closely and give a hint that blends in!</p>
  </div>
</body>
</html>`);
    } else {
      res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Game ${code} - Your Role</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h1>Game ${code}</h1>
    <h2>Category: ${game.category}</h2>
    <h2>Secret Word: ${game.secret}</h2>
    <p>Give a subtle hint about the secret word when it's your turn.</p>
  </div>
</body>
</html>`);
    }
  }
});

// Start round: Process the host’s round start submission.
app.post('/startRound', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const game = games[code];
  if (!game) {
    return res.send('Error: Game not found.');
  }
  const category = req.body.category ? req.body.category.trim() : '';
  const secret = req.body.secret ? req.body.secret.trim() : '';
  if (!category || !secret) {
    return res.send('Error: Category and Secret Word are required.');
  }
  const selectedChams = req.body.chameleon;
  let randomCount = parseInt(req.body.randomCount);
  const playerIds = Object.keys(game.players);
  if (playerIds.length === 0) {
    return res.send(`<!DOCTYPE html>
<html>
<body>
  <h2>No players have joined the game yet.</h2>
  <p><a href="/host/${code}">Back</a></p>
</body>
</html>`);
  }
  let chameleonIds = [];
  if (!isNaN(randomCount) && randomCount > 0) {
    if (randomCount >= playerIds.length) {
      randomCount = playerIds.length - 1;
    }
    const shuffled = playerIds.slice().sort(() => Math.random() - 0.5);
    chameleonIds = shuffled.slice(0, randomCount);
  } else if (selectedChams) {
    if (Array.isArray(selectedChams)) {
      chameleonIds = selectedChams;
    } else {
      chameleonIds = [selectedChams];
    }
  } else {
    const randIndex = Math.floor(Math.random() * playerIds.length);
    chameleonIds = [playerIds[randIndex]];
  }
  playerIds.forEach(pid => {
    game.players[pid].isChameleon = chameleonIds.includes(pid);
  });
  game.secret = secret;
  game.category = category;
  game.roundActive = true;
  res.redirect(`/host/${code}`);
});

// New Round: Reset state for another round.
app.post('/newRound', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const game = games[code];
  if (game) {
    game.roundActive = false;
    game.secret = '';
    game.category = '';
    for (const pid in game.players) {
      if (game.players.hasOwnProperty(pid)) {
        game.players[pid].isChameleon = false;
      }
    }
  }
  res.redirect(`/host/${code}`);
});

// End Game: Terminate the game.
app.post('/endGame', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  if (games[code]) {
    delete games[code];
  }
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Game Ended</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container">
    <h2>Game ${code} has been ended.</h2>
    <p><a href="/">Back to Home</a></p>
  </div>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`Chameleon game server is running on port ${PORT}`);
});
