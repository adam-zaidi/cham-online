// routes/kickRoutes.js
const express = require('express');
const router = express.Router();

router.post('/kick', (req, res) => {
  const code = (req.body.code || '').toUpperCase();
  const playerId = req.body.playerId;
  const game = global.games[code];
  
  if (!game) {
    return res.send("Game not found.");
  }
  
  // Prevent kicking if a round is active.
  if (game.roundActive) {
    return res.send("Cannot kick players during an active round.");
  }
  
  // Prevent kicking the host if they are participating.
  if (game.randomChameleon && playerId === game.hostPlayerId) {
    return res.send("Host cannot be kicked.");
  }
  
  delete game.players[playerId];
  res.redirect(`/host/${code}`);
});

module.exports = router;