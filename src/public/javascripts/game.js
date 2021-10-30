var cameraContainerWidth;
var cameraWidth;
var cameraHeight;
var cameraScale = 1;
var gameType = 'who-is';
var gameRoomId;
var gamePlayerIds;
var acceptedCount;
var curTime;
var timer;
var waitingGameTimer;
var points = {};
var colors;
var gameManager = false;
// var waitingNextRound = false;
// Variable for state of game player - '', 'choose-game', 'play-game'
var gamePlayerState = '';
var leftGameChat = ['humanity', 'who-is', 'guess-who', 'doodly'];
var winnerSound = new Audio('/sounds/winner.mp3');
var playerSeatTableId;
var playerSeatPos;

var startGame = function (data) {
  // Clear waiting game state
  clearInterval(timer);
  clearTimeout(timer);
  $('#waiting-game-msg').hide();

  gamePlayerState = 'play-game';
  // waitingNextRound = false;
  // spiner.stop();
  gameType = data.gameType;
  gameRoomId = data.gameRoomId;
  gamePlayerIds = data.playerIds;
  acceptedCount = gamePlayerIds.length;

  // disconnectAllVideoRoom();
  // connectVideoRoom(`${sceneName}-game-${gameRoomId}`);
  mixpanel.track('Start Game', {
    'gameName': gameType, 
    'ownId': ownId,
    'friends': gamePlayerIds,
    'acceptedCount': acceptedCount
  });


  if (gameType == 'who-is') {
    questions = data.questions;
    initWhoIsGame(data.round);
  } else if (gameType == 'doodly') {
    doodlyWords = data.words;
    doodlyRounds = data.roundCnt;
    initDoodlyGame(data.round);
  } else if (gameType == 'uwo') {
    startUwoGame(data.gameData);
  } else if (gameType == 'humanity') {
    initHumanityGame(data.gameData);
  } else if (gameType == 'love-hate') {
    initLoveHateGame(data);
  } else if (gameType == 'guess-who') {
    initGuessWhoGame(data);
  } else if (gameType == 'codename') {
    initCodenameGame(data);
  } else if (gameType == 'lipoker') {
    initLipokerGame(data);
  } else if (gameType == 'air-hockey') {
    initAirHockeyGame(data);
  } else if (gameType == 'richup') {
    initRichUpGame();
  }

  if (gameType != ('lipoker' || 'richup')) {
    // If gameType is lipoker, don't show game chat
    $('.game-chat-container .msg-container').remove();
    if (leftGameChat.includes(gameType)) {
      $('#left-game-chat').show().find('.game-chat').addClass('active');
    } else {
      $('#bottom-game-chat').show().find('.game-chat').addClass('active');
    }
  }

  //Custom game chat settings, the default is that it shows.
  if (gameType == 'doodly') {
    //Hide chat input for doodly
    $('.game-chat-container .msg-input').hide();
  } else {
    $('.game-chat-container .msg-input').show();
  }

  $('#choose-game-panel-close').data('full-camera', fullscreenCamera);
  fullscreenCamera = false;
  $('#fullscreen-video-button').find('img').attr('src', '/images/extend.svg');
  $('.header').removeClass('dark');
  $('#full-cameras-container').removeClass('d-flex');
  initFullScreenVideoMode();
}

var endGame = function () {
  // disconnectAllVideoRoom();
  // connectVideoRoom(`${sceneName}-game-${gameRoomId}`);

  gamePlayerState = '';
  gameManager = false;
  // spiner.stop();
  if (gameType == 'who-is') {
    whoIsEndGame();
  } else if (gameType == 'doodly') {
    doodlyEndGame();
  } else if (gameType == 'uwo') {
    uwoEndGame();
  } else if (gameType == 'humanity') {
    humanityEndGame();
  } else if (gameType == 'love-hate') {
    loveHateEndGame();
  } else if (gameType == 'guess-who') {
    guessWhoEndGame();
  } else if (gameType == 'codename') {
    codenameEndGame();
  } else if (gameType == 'lipoker') {
    lipokerEndGame();
  } else if (gameType == 'air-hockey') {
    airHockeyEndGame();
  } else if (gameType == 'richup') {
    richupEndGame();
  }

  clearInterval(timer);
  clearTimeout(timer);
  $('.game-chat-container .msg-container').remove();
  $('.game-chat-container').hide();

  if ($('#choose-game-panel-close').data('full-camera')) {
    $('#fullscreen-video-button').click();
  }

  $('#choose-game-container').addClass('d-flex').removeClass('d-none');
  clearInterval(timer);
  clearTimeout(timer);
  clearGame();
}

var leaveGamePlayer = function (data) {
  gamePlayerIds = data.playerIds;
  acceptedCount = gamePlayerIds.length;
  $('#' + data.playerId).find('.camera-container').css({
    width: cameraContainerWidth,
    height: cameraContainerWidth
  }).find('video').css({
    width: cameraWidth,
    height: cameraHeight
  });
  $('#' + data.playerId).appendTo('#cameras-container');
};

var joinGamePlayer = function (data) {
  // if (data.gameType == 'who-is') {

  // } else if (gameType == 'doodly') {

  // } else if (gameType == 'humanity') {

  // } else if (gameType == 'love-hate') {

  // }
};

var joinGame = function (data) {
  // It's not used
  // gamePlayerState = 'play-game';
  // // spiner.stop();
  // waitingNextRound = true;
  // gameType = data.gameType;
  // gameRoomId = data.gameRoomId;
  // gamePlayerIds = data.playerIds.concat(data.joinedPlayerIds);
  // acceptedCount = gamePlayerIds.length;
  // if (gameType == 'who-is') {
  //   questions = data.questions;
  //   initWhoIsGame(data.round, false);
  // } else if (gameType == 'doodly') {
  //   doodlyWords = data.words;
  //   doodlyRounds = data.roundCnt;
  //   initDoodlyGame(data.round, data.points, false);
  // } else if (gameType == 'humanity') {
  //   initHumanityGame(data.gameData, false);
  // } else if (gameType == 'love-hate') {
  //   initLoveHateGame(data, false);
  // }
};

$('#btn-exit-game').click(function () {
  sendMessage({
    type: 'reject-play-game',
    data: gameRoomId
  });
  endGame();
});

$('.leave-game-button').click(function () {
  sendMessage({
    type: 'leave-game',
    // data: waitingNextRound
  });
  endGame();
});

$('.game-chat-container .msg-input').keypress(function (e) {
  if ($(this).val() && e.keyCode == 13) {
    sendMessage({
      type: 'game-msg',
      data: $(this).val()
    });
    $(this).val('');
  }
});

//Resets the game at the table
function clearGame(gameRoomId) {
  if (gameRoomId) {
    sendMessage({
      type: 'cancel-game',
      data: gameRoomId
    });
  }
  $('#choose-game-container').addClass('d-flex').removeClass('d-none');
  $('#waiting-game-msg').hide();
}

$('#waiting-game-msg').click(function () {
  clearGame(gameRoomId)
});

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function addGameChat(playerId, msg) {
  var $cloneMsg = $('.msg-container-clone').clone()
    .removeClass('msg-container-clone')
    .addClass('msg-container');

  var $msgBox = $('.game-chat-container .game-chat.active .msg-box');

  if (playerId == ownId) {
    $cloneMsg.find('.name').text('You:');
  } else {
    var firstName = playerInfoList[playerId].name.split(' ')[0];
    $cloneMsg.find('.name').text(firstName + ':');
  }
  $cloneMsg.find('.msg').text(replaceEmoji(msg));
  $msgBox.append($cloneMsg);
  $msgBox.scrollTop($msgBox.prop('scrollHeight'));
}

function replaceEmoji(msg) {
  var buf = '';
  while (buf != msg) {
    if (buf) {
      msg = buf;
    } else {
      buf = msg;
    }
    for (text in emojiTexts) {
      var re = new RegExp('(^| )' + text + '( |$)', 'i');
      if (re.test(msg)) {
        buf = msg.replace(re, '$1' + emojiTexts[text] + '$2');
        continue;
      }
    }
  }
  return msg;
}

$('.game-chat-show-button').click(function () {
  $(this).siblings('.game-chat').addClass('active');
});

$('.close-game-chat').click(function () {
  $(this).parents('.game-chat').removeClass('active');
});

function sitPlayerCount(tableId) {
  var cnt = 0;
  for (const playerId in seatStates) {
    if (seatStates[playerId].tableId == tableId) {
      cnt++;
    }
  }
  return cnt;
}
