/**
 * Player constructor
 * @param {*} deck
 * @param {*} id
 * @param {*} index
 * @param {*} bot
 * @param {*} unoCall
 */
function Player(deck, id, index, bot, unoCall) {
  this.isBot = bot;
  this.playerDeck = deck;
  this.playerID = id;
  this.playerIndex = index;
}

/**
 * End current player's turn and begin next player's turn
 */
function rotatePlayers() {
  gameTurn = gameTurn + gameDirection;

  if (gameTurn == players.length) {
    gameTurn = 0;
  }
  else if (gameTurn < 0) {
    gameTurn = players.length - 1;
  }
}
