// routes/hostRoutes.js
const express = require('express');
const router = express.Router();
const { generateGameCode } = require('../utils/utils');

// GET homepage: show create and join forms.
router.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="/style.css">
  <title>Chameleon Online</title>
</head>
<body>
  <div class="container">
    <h1>Chameleon Online</h1>
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
        <!--
        <label>
          <input type="checkbox" name="isDark" value="true">
          After Dark Mode
        </label>
        </br>
        -->
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

// POST /create: Host creates a new game.
router.post('/create', (req, res) => {
  const code = generateGameCode();
  const hostName = req.body.hostName;
  const useRandomSecret = req.body.useRandomSecret ? true : false;
  const randomChameleon = req.body.randomChameleon ? true : false;
  
  global.games[code] = {
    code,
    hostName,
    useRandomSecret,
    randomChameleon,
    players: {},
    roundActive: false,
    secret: '',
    category: '',
    starting_player: ""
  };
  
  // If the host participates, add them as a player.
  if (randomChameleon) {
    let playerId;
    do {
      playerId = Math.random().toString(36).substr(2, 6);
    } while (global.games[code].players[playerId]);
    global.games[code].players[playerId] = { name: hostName, isChameleon: false };
    global.games[code].hostPlayerId = playerId;
  }
  res.redirect(`/host/${code}`);
});

// GET /host/:code: Host lobby page.
router.get('/host/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const game = global.games[code];
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

  // If round is active, show active round view.
  if (game.roundActive) {
    const chameleonNames = Object.values(game.players)
      .filter(p => p.isChameleon)
      .map(p => p.name)
      .join(', ');
    let hostRoleInfo = "";
    if (game.randomChameleon && game.hostPlayerId && game.players[game.hostPlayerId]) {
      const hostIsCham = game.players[game.hostPlayerId].isChameleon;
      if (hostIsCham) {
        hostRoleInfo = `<h2>You are the <span class="chameleon">Chameleon</span>!</h2>
                        <p><strong>Other Chameleon(s):</strong> ${chameleonNames || "None"}</p>`;
      } else {
        hostRoleInfo = `<h2>Secret Word: ${game.secret}</h2>`;
      }
    } else {
      hostRoleInfo = `<h2>Secret Word: ${game.secret}</h2>
                      <p><strong>Chameleon(s):</strong> ${chameleonNames || "None"}</p>`;
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
    <h2>Starting Player: ${game.starting_player}</h2>
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
  
  // Otherwise, show lobby view (non-active round) with kick buttons.
  let playerListHtml;
  const playersEntries = Object.entries(game.players);
  if (playersEntries.length === 0) {
    playerListHtml = '<p>No players have joined yet.</p>';
  } else {
    playerListHtml = '<ul>' + playersEntries.map(([pid, p]) => {
      let kickButton = '';
      if (!(game.randomChameleon && pid === game.hostPlayerId)) {
        kickButton = `<form action="/kick" method="POST" style="display:inline; margin-left:10px; width:50px;">
                        <input type="hidden" name="code" value="${code}">
                        <input type="hidden" name="playerId" value="${pid}">
                        <button type="submit" style="font-size:0.8em; width:50px;">Kick</button>
                      </form>`;
      }
      return `<li>${p.name} ${kickButton}</li>`;
    }).join('') + '</ul>';
  }
  
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
    <p><a href="/host/${code}">🔄 Refresh player list</a></p>
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
        <input type="number" name="randomCount" min="1" max="${Math.max(1, playersEntries.length - 1)}">
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
    <form action="/endGame" method="POST" style="margin-top:10px;">
      <input type="hidden" name="code" value="${code}">
      <button type="submit">End Game</button>
    </form>
  </div>
</body>
</html>`);
});

module.exports = router;