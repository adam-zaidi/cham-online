// utils/utils.js

// Utility to generate a unique 4-letter game code.
function generateGameCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (global.games[code]);
  return code;
}

// Utility to select a random word and category from the dataset.
function getRandomWord() {
  const wordDataset = require('../Standard.json');
  const categories = Object.keys(wordDataset);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const words = wordDataset[randomCategory];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  return { category: randomCategory, secret: randomWord };
}

// Weighted random selection function for number of chameleons.
function chooseNumChameleons(n, alpha = 1) {
  const r = 1 - 1 / Math.sqrt(n);
  const q = Math.pow(r, alpha);
  const denom = 1 - Math.pow(q, n);
  const random = Math.random();
  let cumulative = 0;
  for (let k = 1; k <= n; k++) {
    cumulative += (Math.pow(q, k - 1) * (1 - q)) / denom;
    if (random <= cumulative) {
      return k;
    }
  }
  return n; // fallback
}

module.exports = { generateGameCode, getRandomWord, chooseNumChameleons };