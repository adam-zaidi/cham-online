const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

// Load the word dataset from a separate JSON file (e.g., Standard.json or wordDataset.json)
const wordDataset = require('./Standard.json');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory storage for games
let games = {};

// Utility to generate a unique 4-letter game code.
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

// Utility to select a random word and category from the dataset.
function getRandomWord() {
  const categories = Object.keys(wordDataset);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const words = wordDataset[randomCategory];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  return { category: randomCategory, secret: randomWord };
}

// Homepage: Options to create a new game or join an existing game.
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="/style.css">
  <title>Chameleon Game</title>
</head>
<body>
  <div class="container">
    <h1>Chameleon Game</h1>
    <div class="section">
      <h2>Create a New Game (Host)</h2>
      <form action="/create" method="POST">
        <label for="hostName">Your Display Name:</label>
        <input type="text" id="hostName" name="hostName" required>
        <br/>
        <label>
          <input type="checkbox" name="useRandomSecret" value="true">
          Use Random Secret Word
        </label>
        <br/>
        <label>
          <input type="checkbox" name="randomChameleon" value="true">
          The Host is Participating
        </label>
        <br/>
        <button type="submit">Create Game</button>
      </form>
    </div>
    <div class="section">
      <h2>Join an Existing Game</h2>
      <form action="/join" method="POST">
        <label for="code">Game Code:</label>
        <input type="text" id="code" name="code" required>
        <br/>
        <label for="name">Display Name:</label>
        <input type="text" id="name" name="name" required>
        <br/>
        <button type="submit">Join Game</button>
      </form>
    </div>
    <!-- How to Play Instructions Box -->
    <div class="instructions">
      <h3>How to Play</h3>
      <ol>
        <li><strong>Create or Join:</strong> The host creates a game and shares the code. Players join by entering the game code and choosing a display name.</li>
        <li><strong>Setup the Round:</strong> You can manually enter a secret word and category, or choose to use a random secret word from our dataset. The category will be shown to all players while the secret word remains hidden from the chameleon.</li>
        <li><strong>Role Assignment:</strong> Select chameleon(s) manually or let the game assign them randomly. If you opt for random assignment, you (the host) will also participate as a player.</li>
        <li><strong>Gameplay:</strong> Each player gives a hint related to the secret word. The chameleon, knowing only the category, must bluff to blend in.</li>
        <li><strong>Discussion & Voting:</strong> After hints are given, players discuss and vote on who they think the chameleon is.</li>
        <li><strong>New Round or End Game:</strong> You can start a new round with the same players or end the game.</li>
      </ol>
    </div>
  </div>
</body>
</html>`);
});

// Create Game: Host creates a new game.
app.post('/create', (req, res) => {
  const code = generateGameCode();
  const hostName = req.body.hostName;
  // Use a robust way to interpret checkboxes: if the field exists, set to true.
  const useRandomSecret = req.body.useRandomSecret ? true : false;
  const randomChameleon = req.body.randomChameleon ? true : false;
  
  // Initialize game state.
  games[code] = {
    code: code,
    hostName: hostName,
    useRandomSecret: useRandomSecret,
    randomChameleon: randomChameleon,
    players: {},  // Other players will join here.
    roundActive: false,
    secret: '',
    category: ''
  };
  
  // If the host opts for random chameleon assignment, add the host as a player.
  if (randomChameleon) {
    let playerId;
    do {
      playerId = Math.random().toString(36).substr(2, 6);
    } while (games[code].players[playerId]);
    games[code].players[playerId] = { name: hostName, isChameleon: false };
    games[code].hostPlayerId = playerId; // For reference if needed.
  }
  res.redirect(`/host/${code}`);
});

// Join Game: Player joins an existing game.
app.post('/join', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const name = req.body.name;
  if (!code || !games[code]) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="/style.css">
  <title>Game Not Found</title>
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
  <link rel="stylesheet" href="/style.css">
  <title>Game Full</title>
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
  <link rel="stylesheet" href="/style.css">
  <title>Round in Progress</title>
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

// Host Lobby Page: Shows game info, player list, and controls.
app.get('/host/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const game = games[code];
  if (!game) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="/style.css">
  <title>Game Not Found</title>
</head>
<body>
  <div class="container">
    <h2>Game ${code} not found or ended.</h2>
    <p><a href="/">Back to Home</a></p>
  </div>
</body>
</html>`);
  }

  // If a round is active, show the active round view.
  if (game.roundActive) {
    // Build a list of chameleon names.
    const chameleonNames = Object.values(game.players)
      .filter(p => p.isChameleon)
      .map(p => p.name)
      .join(', ');

    // Determine the host's view if they are participating.
    let hostRoleInfo = "";
    if (game.randomChameleon && game.hostPlayerId && game.players[game.hostPlayerId]) {
      // If the host is playing, check if they are the chameleon.
      const hostIsCham = game.players[game.hostPlayerId].isChameleon;
      if (hostIsCham) {
        hostRoleInfo = "<h2>You are the <span class='chameleon'>Chameleon</span>!</h2>";
      } else {
        hostRoleInfo = `<h2>Secret Word: ${game.secret}</h2>`;
      }
    } else {
      // If the host isn't participating as a player, show the secret word.
      hostRoleInfo = `<h2>Secret Word: ${game.secret}</h2>`;
    }

    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="/style.css">
  <title>Game ${code} - Round In Progress (Host)</title>
</head>
<body>
  <div class="container">
    <h1>Game ${code} - Round In Progress</h1>
    <h2>Category: ${game.category}</h2>
    ${hostRoleInfo}
    <p><strong>Chameleon(s):</strong> ${chameleonNames ? chameleonNames : "None"}</p>
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

  // Otherwise, when no round is active, show the lobby page to start a new round.
  let playerListHtml;
  const players = Object.values(game.players);
  if (players.length === 0) {
    playerListHtml = '<p>No players have joined yet.</p>';
  } else {
    playerListHtml = '<ul>' + players.map(p => `<li>${p.name}</li>`).join('') + '</ul>';
  }
  
  // If random secret word is enabled, show a message instead of manual input fields.
  let secretWordFields = "";
  if (game.useRandomSecret) {
    secretWordFields = `<p>A random secret word and its category will be chosen from our dataset.</p>`;
  } else {
    secretWordFields = `
      <p>
        <label>Category:</label>
        <input type="text" name="category" required>
      </p>
      <p>
        <label>Secret Word:</label>
        <input type="text" name="secret" required>
      </p>
    `;
  }
  
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="/style.css">
  <title>Game ${code} - Host Lobby</title>
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
      ${secretWordFields}
      <p><strong>Select Chameleon(s):</strong></p>
      <div>
      ${(() => {
          let checkboxList = "";
          for (const pid in game.players) {
            if (game.players.hasOwnProperty(pid)) {
              const playerName = game.players[pid].name;
              checkboxList += `<label><input type="checkbox" name="chameleon" value="${pid}"> ${playerName}</label><br/>`;
            }
          }
          return checkboxList || "<p>(No players yet)</p>";
      })()}
      </div>
      <p><em>— OR — assign chameleons randomly:</em></p>
      <p>
        <label>Number of Chameleons:</label>
        <input type="number" name="randomCount" min="1" max="${Math.max(1, players.length - 1)}">
      </p>
      <button type="submit">Start Round</button>
    </form>
    <!-- How to Play Instructions Box -->
    <div class="instructions">
      <h3>How to Play</h3>
      <ol>
        <li><strong>Create or Join:</strong> The host creates a game and shares the code. Players join by entering the game code and choosing a display name.</li>
        <li><strong>Setup the Round:</strong> You can manually enter a secret word and category, or choose to use a random secret word from our dataset. The category will be shown to all players while the secret word remains hidden from the chameleon.</li>
        <li><strong>Role Assignment:</strong> Select chameleon(s) manually or let the game assign them randomly. If you opt for random assignment, you (the host) will also participate as a player.</li>
        <li><strong>Gameplay:</strong> Each player gives a hint related to the secret word. The chameleon, knowing only the category, must bluff to blend in.</li>
        <li><strong>Discussion & Voting:</strong> After hints are given, players discuss and vote on who they think the chameleon is.</li>
        <li><strong>New Round or End Game:</strong> You can start a new round with the same players or end the game.</li>
      </ol>
    </div>
    <p><a href="/host/${code}">🔄 Refresh player list</a></p>
    <form action="/endGame" method="POST" style="margin-top:10px;">
      <input type="hidden" name="code" value="${code}">
      <button type="submit">End Game</button>
    </form>
  </div>
</body>
</html>`);
});

// Player Page: Shows the player's role.
app.get('/game/:code/player/:playerId', (req, res) => {
  const code = req.params.code.toUpperCase();
  const playerId = req.params.playerId;
  const game = games[code];
  if (!game) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="/style.css">
  <title>Game Not Found</title>
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
  <link rel="stylesheet" href="/style.css">
  <title>Player Not Found</title>
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
  <link rel="stylesheet" href="/style.css">
  <title>Game ${code} - Waiting</title>
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
  <link rel="stylesheet" href="/style.css">
  <title>Game ${code} - Your Role</title>
</head>
<body>
  <div class="container">
    <h1>Game ${code}</h1>
    <h2>Category: ${game.category}</h2>
    <h2>You are the <span class="chameleon">Chameleon</span>!</h2>
    <p>You do <strong>not</strong> know the secret word. Listen carefully and give a hint that blends in!</p>
  </div>
</body>
</html>`);
    } else {
      res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="/style.css">
  <title>Game ${code} - Your Role</title>
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

// Start Round: Process the host's submission and begin the round.
app.post('/startRound', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const game = games[code];
  if (!game) {
    return res.send('Error: Game not found.');
  }
  let category, secret;
  if (game.useRandomSecret) {
    const randomData = getRandomWord();
    category = randomData.category;
    secret = randomData.secret;
  } else {
    category = req.body.category ? req.body.category.trim() : '';
    secret = req.body.secret ? req.body.secret.trim() : '';
  }
  if (!category || !secret) {
    return res.send('Error: Category and Secret Word are required.');
  }
  const selectedChams = req.body.chameleon;
  let randomCount = parseInt(req.body.randomCount);
  const playerIds = Object.keys(game.players);
  if (playerIds.length === 0) {
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="/style.css">
  <title>No Players</title>
</head>
<body>
  <div class="container">
    <h2>No players have joined the game yet.</h2>
    <p><a href="/host/${code}">Back</a></p>
  </div>
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

// New Round: Reset round-specific data.
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
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="/style.css">
  <title>Game Ended</title>
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