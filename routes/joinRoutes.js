// routes/joinRoutes.js
const express = require('express');
const router = express.Router();

router.post('/join', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const name = req.body.name;
  const game = global.games[code];
  if (!code || !game) {
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
  if (Object.keys(game.players).length >= 20) {
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
  if (game.roundActive) {
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
  } while (game.players[playerId]);
  game.players[playerId] = { name: name, isChameleon: false };
  res.redirect(`/game/${code}/player/${playerId}`);
});

module.exports = router;