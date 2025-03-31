// server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Global in-memory storage for games.
global.games = {};

// Mount our route modules.
const hostRoutes = require('./routes/hostRoutes');
const joinRoutes = require('./routes/joinRoutes');
const gameRoutes = require('./routes/gameRoutes');
const kickRoutes = require('./routes/kickRoutes');

app.use('/', hostRoutes);
app.use('/', joinRoutes);
app.use('/', gameRoutes);
app.use('/', kickRoutes);

app.listen(PORT, () => {
  console.log(`Chameleon game server is running on port ${PORT}`);
});