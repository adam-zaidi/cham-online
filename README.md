# Chameleon Online

The board game Chameleon is much fun, but it becomes even more fun when you can choose your word. My friend's and I's past solution to this was to text each person the secret word individually, but with many people this became cumbersome. Searching online, no website or app included the option to choose a custom word. Out of frustration (and a bit of procrastination), I made an online version of Chameleon that you can play with your friends, using Express.js. Simply create a lobby, and your friends can join on their own devices. Once the secret word and chameleon/s are chosen, they will be sent out to each player, and the games can begin!

How to Play:

1. **Create or Join:** The host creates a game and shares the code. Players join by entering the game code and choosing a display name.
2. **Setup the Round:** The host enters a secret word and a category, then designates the chameleon(s) either manually or randomly.
3. **Role Assignment:** Non-chameleon players see the secret word and category, while chameleons only see the category along with a special message.
4. **Gameplay:** Each player gives a hint related to the secret word. The chameleon must bluff by giving a vague hint.
5. **Discussion & Voting:** After hints are given, players discuss and vote on who they think the chameleon is.
6. **New Round or End Game:** The host can start a new round with the same players or end the game altogether.
