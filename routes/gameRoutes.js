// routes/gameRoutes.js
const express = require('express');
const router = express.Router();
const { getRandomWord, chooseNumChameleons } = require('../utils/utils');

router.get('/game/:code/player/:playerId', (req, res) => {
  const code = req.params.code.toUpperCase();
  const playerId = req.params.playerId;
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
      const startingPlayerInfo = `<h2>Starting Player: ${game.starting_player}</h2>`;
      const allChams = Object.values(game.players).filter(p => p.isChameleon);
      const otherChams = allChams.filter(p => p.name !== player.name);
      const otherChamsText = otherChams.length > 0 ? otherChams.map(p => p.name).join(', ') : "None";
      
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
    <h3>Other Chameleons: ${otherChamsText}</h3>
    ${startingPlayerInfo}
    <p>You do <strong>not</strong> know the secret word. Listen carefully and give a hint that blends in!</p>
  </div>
</body>
</html>`);
    } else {
      const startingPlayerInfo = `<h2>Starting Player: ${game.starting_player}</h2>`;
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
    ${startingPlayerInfo}
    <p>Give a subtle hint about the secret word when it's your turn.</p>
  </div>
</body>
</html>`);
    }
  }
});

router.post('/startRound', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const game = global.games[code];
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
  } else if (game.randomChameleon) {
    const numChams = chooseNumChameleons(playerIds.length, 1.5);
    const shuffled = playerIds.slice().sort(() => Math.random() - 0.5);
    chameleonIds = shuffled.slice(0, numChams);
  } else {
    const randIndex = Math.floor(Math.random() * playerIds.length);
    chameleonIds = [playerIds[randIndex]];
  }
  playerIds.forEach(pid => {
    game.players[pid].isChameleon = chameleonIds.includes(pid);
  });
  
  const playerKeys = Object.keys(game.players);
  const randomIndex = Math.floor(Math.random() * playerKeys.length);
  game.starting_player = game.players[playerKeys[randomIndex]].name;
  
  game.secret = secret;
  game.category = category;
  game.roundActive = true;
  res.redirect(`/host/${code}`);
});

router.post('/newRound', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const game = global.games[code];
  if (game) {
    game.roundActive = false;
    game.secret = '';
    game.category = '';
    game.starting_player = "";
    for (const pid in game.players) {
      if (game.players.hasOwnProperty(pid)) {
        game.players[pid].isChameleon = false;
      }
    }
  }
  res.redirect(`/host/${code}`);
});

router.post('/endGame', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  if (global.games[code]) {
    delete global.games[code];
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

module.exports = router;