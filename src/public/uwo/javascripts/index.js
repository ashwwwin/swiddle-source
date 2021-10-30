$(document).ready(function () {
  $(document).on("click", ".my-card", function () {
    let cardIndex = $(".my-card").index(this);
    players[gameTurn].playerDeck.playCard(cardIndex);
  });

  $(document).on('click', '#choose-color-close', function() {
    $('#overlay').hide()
  })
});

// global Playfield Card
let discardPile = new Deck("discardDeckDiv", false);

// create a Global array to store players
let players = [];

// initial amount of cards for each player
let initialCards = 7;

// global Turn Tracker
let gameTurn = 0;

// set direction of game, 1 for forward, -1 for backward
let gameDirection = 1;

// store if initial draw
let initialDraw = true;

// store how many +2, or +4s are stacked
let drawStack = {
  cardValue: 0,
  stackAmt: 0,
  cardType: 2, // either 2 or 4
  updateStack: function () {
    document.getElementById("drawCardPile").innerHTML =
      "+" + this.cardType * this.stackAmt;
  },
  clearVisual: function () {
    document.getElementById("drawCardPile").innerHTML = "";
  }
};

// for buy-4 or chnage color
let currentSpecialCard = {};

// global Game object
let globalGame = {};

let mySeatIdx;

const posList = {
  2: [3],
  3: [2, 4],
  4: [2, 3, 4],
  5: [6, 2, 4, 7],
  6: [6, 2, 3, 4, 7],
  7: [6, 1, 2, 4, 5, 7],
  8: [6, 1, 2, 3, 4, 5, 7],
  9: [8, 6, 1, 2, 4, 5, 6, 7, 9],
  10: [8, 6, 1, 2, 3, 4, 5, 6, 7, 9]
};

let seats;

/**
 * Change the displayed text and call function to randomize playfield card
 */
function initializeWindow() {
  // re-assign global card value to random values
  selectPlayfieldCard();
  discardPile.reloadHand();
}

function initializePlayers(gameData, initial = false) {
  globalGame = gameData;
  gameTurn = gameData.currentPlayerIndex;
  globalGame.players.filter((player) => {
    return player.status != 'offline'
  })

  if (initial) {
    players = [];

    seats = posList[gameData.players.length];
    $('.camera-item').appendTo('#cameras-container');
    $('.seat').addClass('d-none').removeClass('d-flex');

    if (seats.length == 1 || seats.length == 2 || seats.length == 3) {
      $('#discardDeckDiv').parent().removeClass('justify-content-between').addClass("justify-content-center").css("margin-top", "30px");
    }
  }

  mySeatIdx = gamePlayerIds.indexOf(ownId);

  for (let i=0; i<gameData.players.length; i++) {
    let player = gameData.players[i];
    let playerHandDiv = seats[(acceptedCount + i - mySeatIdx) % acceptedCount - 1];
    let tempDeck;
    let tempPlayer;

    if (initial) {
      tempDeck = (i == mySeatIdx) ? new Deck("my-uwo-cards", false) : new Deck('.uwo-seat-' + playerHandDiv, true);
      tempPlayer = new Player(tempDeck, player, (acceptedCount + i - mySeatIdx) % acceptedCount - 1, false, false);
      players.push(tempPlayer);
    } else {
      tempPlayer = players[i];
    }
    tempPlayer.playerDeck.clear();
    for (let j = 0; j < player.handCards.length; j++) {
      tempPlayer.playerDeck.drawCard(player.handCards[j]);
    }

    tempPlayer.playerDeck.reloadHand();
  }

  if (gameData.usedCards.length) {
    discardPile.clear();
    discardPile.drawCard(gameData.usedCards[0]);
    discardPile.reloadHand();
  }

  initialDraw = initial;

  if (initial) {
    $('#continue-game-panel').removeClass('d-flex');
    $('#cameras-container').hide();
    $('#uwo-game-scene').show();

    $('.camera-item').filter(function() {
      return gamePlayerIds.includes($(this).data('playerId'));
    }).each(function() {
      const arrPos = gamePlayerIds.indexOf($(this).data('playerId'))
      if (arrPos == mySeatIdx) {
        $(this).appendTo($('#my-uwo-seat').removeClass('d-none'))
      } else {
        $(this).appendTo($('.uwo-seat-' + seats[(acceptedCount + arrPos - mySeatIdx) % acceptedCount - 1]).removeClass('d-none'));
      }
    });
  }

  let currentTimer;
  if (mySeatIdx == globalGame.currentPlayerIndex) {
    currentTimer = $('#my-uwo-seat .timer');
  } else {
    playerHandDiv = seats[(acceptedCount + globalGame.currentPlayerIndex - mySeatIdx) % acceptedCount - 1];
    currentTimer = $('.uwo-seat-' + playerHandDiv).find('.timer');
  }

  if (currentTimer.css('display') == 'none')
    resetTimer();

  $('.timer').hide();
  currentTimer.show();
  $('#overlay').hide();
}

function showUwoResult(ranks) {
  $('#uwo-game-scene').hide();
  $('#uwo-game-scene .camera-item').appendTo('#continue-game-cameras-container');
  $('#continue-game-result .d-flex').remove();
  $('#btn-exit-game').prop('disabled', false);

  const winnerId = ranks[0];

  if (winnerId == ownId) {
    sendMessage({
      type: 'winner'
    });
  }

  let otherRanks = globalGame.players.sort((a, b) => {
    return a.handCards.length - b.handCards.length
  })

  for (i=0; i<otherRanks.length; i++) {
    if (playerInfoList[otherRanks[i].id])
      $('#continue-game-result').append('<div class="d-flex justify-content-between mb-1"><span>'+(i+1)+'.   '+playerInfoList[otherRanks[i].id].name+'</span><span id="'+otherRanks[i].id+'"></span></div>');
  }

  $.confetti.restart('globalConfettiCanvas');
  $(`#${winnerId} .camera-container`).animate({
    width: cameraContainerWidth * 1.2,
    height: cameraContainerWidth * 1.2,
  }, 500).find('video').animate({
    width: cameraWidth * 1.2,
    height: cameraHeight * 1.2
  }, 500);
  setTimeout(function() {
    $.confetti.stop();
    $(`#${winnerId} .camera-container`).animate({
      width: cameraContainerWidth,
      height: cameraContainerWidth,
    }).find('video').animate({
      width: cameraWidth,
      height: cameraHeight
    });
  }, 2000);
  winnerSound.play();
  $('#continue-game-result').show();
  $('#continue-game-panel').addClass('d-flex');
}

function uwoEndGame() {
  $('.camera-container').css({
    width: cameraContainerWidth,
    height: cameraContainerWidth
  }).find('video').css({
    width: cameraWidth,
    height: cameraHeight
  });
  $('.camera-item').appendTo('#cameras-container');
  $('#cameras-container').show();
  $('#uwo-game-scene').hide();
  $('#continue-game-panel').removeClass('d-flex');
  $('#globalConfettiCanvas').hide();
}

function changeGameState(gameData) {
  initializePlayers(gameData);
}

function startUwoGame(gameData) {
  $('.camera-container').css({
    width: cameraContainerWidth,
    height: cameraContainerWidth,
  }).find('video').css({
    width: cameraWidth,
    height: cameraHeight
  });

  $('#discardDeckDiv').empty();
  $('.circle_animation').css('stroke-dashoffset', 535);
  $('.timer').hide();

  initializePlayers(gameData, true);
}

/**
 * Uno call button
 */
function callUno() {
  sendMessage({
    type: "uwoCall-check"
  })
}

function resetTimer() {
  curTime = 18, initialOffset = 535, i = 1;
  $('.circle_animation').css('stroke-dashoffset', 535);
  clearTimeout(timer);

  timer = setInterval(function() {
    if (i == curTime) {
      clearInterval(timer);
			return;
    }

    $('.circle_animation').css('stroke-dashoffset', initialOffset-((i+1)*(initialOffset/curTime)));
    i++;
  }, 1000);
}
