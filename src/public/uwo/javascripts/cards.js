/**
 * card constructor
 * @param {*} color
 * @param {*} value
 */
function Card({color, type, id, canBeUsed}) {
  this.color = color;
  this.value = type;
  this.id=id;
  this.canBeUsed = canBeUsed;
  this.getColorValue = function () {
    switch (this.color) {
      case "red":
        return "#A60000";
      case "blue":
        return "#0000FF";
      case "green":
        return "#004f19";
      case "yellow":
        return "#e5bf00";
      default:
        return "#333333";
    }
  };
}

/**
 * Function draws a specific card for cheat
 */
function drawSpecificCard(cardInfo) {
  players[gameTurn].playerDeck.drawSpecificCard(cardInfo);
}

/**
 * Function draws a specific card for cheat code
 */
function removeManyCards(numberOfCards) {
  if (numberOfCards > players[gameTurn].playerDeck.amtCards - 2) {
    return;
  }

  for (let i = 0; i < numberOfCards; i++) {
    players[gameTurn].playerDeck.removeCard(0);
  }
  players[gameTurn].playerDeck.reloadHand();
}