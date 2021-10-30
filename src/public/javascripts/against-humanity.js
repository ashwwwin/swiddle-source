var isCzar = false;
var czarName = '';
var gameData;


var selectCardAudio = new Audio('/sounds/pb_n_j/PBnJ_Select.mp3');
selectCardAudio.volume = 1;
var winningCardAudio = new Audio('/sounds/pb_n_j/PBnJ_winningcard.mp3');
winningCardAudio.volume = 1;
var yourTurnAudio = new Audio('/sounds/pb_n_j/your-turn.mp3');
yourTurnAudio.volume = 1;


var initHumanityGame = function (data, start=true) {
  if (acceptedCount < 7) {
    cameraScale = $('body').width() / 10 / cameraContainerWidth;
  } else {
    cameraScale = $('body').width() / 15 / cameraContainerWidth;
  }
  $('.pointer-state').remove();
  $('.correct-guess').remove();
  $('.camera-item').appendTo('#cameras-container');
  $('.camera-item').filter(function () {
    return gamePlayerIds.includes($(this).attr('id'));
  }).each(function () {
    $(this).append('<span class="pointer-state"></span>');
    $(this).append('<i class="fa fa-check text-success correct-guess d-none">');
    $(this).appendTo('#humanity-cameras-container');
  });
  $('#humanity-cameras-container .camera-container').css({
    width: cameraContainerWidth * cameraScale,
    height: cameraContainerWidth * cameraScale,
  }).find('video').css({
    width: cameraWidth * cameraScale,
    height: cameraHeight * cameraScale
  });
  $('#humanity-game-scene').show();
  if (start) {
    humanityStartNewRound(data);
  } else {
    for (i = 0; i < data.players.length; i++) {
      var player = data.players[i];
      $(`#${player.id} .pointer-state`).text(player.awesomePoints + ' points');
    }
    for (i = 0; i < data.playerIds.length; i++) {
      var playerId = data.playerIds[i];
      $(`#${playerId} .pointer-state`).text('0 points');
    }
    $('#black-card').html(data.currentBlackCard);
    $('#humanity-game-scene .wating-next-round').show();
  }
}

var humanityStartNewRound = function (data) {
  $('#humanity-game-scene .wating-next-round').hide();
  $('#black-card').html(data.currentBlackCard);
  var cardInfo = data.players.find(function (player) {
    return player.id == ownId;
  });
  $('.select-white-card').remove();
  $('.select-review-card').remove();
  czarName = playerInfoList[gamePlayerIds[data.czarIdx]].name;
  if (gamePlayerIds[data.czarIdx] == ownId) {
    isCzar = true;
    $('#waiting-text').text('Waiting for players to select cards');
  } else {
    isCzar = false;
    for (i = 0; i < cardInfo.cards.length; i++) {
      var $cloneWhiteCard = $('.white-card-clone').clone()
        .removeClass('white-card-clone')
        .addClass('select-white-card');
      $cloneWhiteCard.text(cardInfo.cards[i]);
      $('#white-card-list').append($cloneWhiteCard);
    }
  }
  $('.correct-guess').addClass('d-none').removeClass('d-block');
  for (i = 0; i < data.players.length; i++) {
    var player = data.players[i];
    $(`#${player.id}`).find('.pointer-state').text(player.awesomePoints + ' points');
  }
}

var reviewCard = function (data) {
  $('.select-white-card').remove();
  $('.select-review-card').remove();
  for (i = 0; i < data.length; i++) {
    var row = data[i];
    if (row.selectedWhiteCardId) {
      var $cloneReviewCard = $('.review-card-clone').clone()
        .removeClass('review-card-clone')
        .addClass('select-review-card');
      $cloneReviewCard.text(row.selectedWhiteCardId);
      $('#review-card-list').append($cloneReviewCard);
    }
  }
  if (isCzar) {
    yourTurnAudio.play();
    $('#waiting-text').text('Pick a card');
  } else {
    $('#waiting-text').text('Waiting for ' + czarName + ' to pick the funniest card');
    $('.select-review-card').addClass('disabled');
  }
}

var selectWinner = function (data) {
  $(`#${data.playerId}`).find('.correct-guess').removeClass('d-none').addClass('d-block');
  $(`#${data.playerId}`).find('.pointer-state').text(data.points + ' points');

  //Playing the sound only for the winner
  if ((data.playerId) == ownId) {
    winningCardAudio.play();
  }


  var text = $('#black-card').text();
  if (text.indexOf('__________') != -1) {
    text = text.replace('__________', '<span class="text-success">' + data.cardId + '</span>');
  } else {
    text = text + ' <span class="text-success">' + data.cardId + '</span>';
  }
  $('#black-card').html(text);
  $('#waiting-text').text('');
}

var resultHumanityGame = function (data) {
  $('.pointer-state').remove();
  $('.correct-guess').remove();
  $('#humanity-cameras-container .camera-item').appendTo('#continue-game-cameras-container');
  $('#continue-game-result .d-flex').remove();

  var sortable = [];
  for (i = 0; i < data.players.length; i++) {
    var player = data.players[i];
    if (gamePlayerIds.includes(player.id)) {
      var playerName = playerInfoList[player.id].name;
      sortable.push([playerName, player.awesomePoints, player.id]);
    }
  }
  sortable.sort(function (a, b) {
    return b[1] - a[1];
  });

  for (i = 0; i < sortable.length; i++) {
    $('#continue-game-result').append('<div class="d-flex justify-content-between mb-1"><span>' + sortable[i][0] + '</span><span>' + sortable[i][1] + '</span></div>');
    if (sortable[0][1] == sortable[i][1]) {
      if (sortable[i][2] == ownId) {
        $.confetti.restart('globalConfettiCanvas');
        setTimeout(function () {
          $.confetti.stop();
        }, 3000);
        winnerSound.play();
      }
      $('#' + sortable[i][2]).find('.camera-container').css({
        width: cameraContainerWidth * cameraScale * 1.2,
        height: cameraContainerWidth * cameraScale * 1.2,
      }).find('video').css({
        width: cameraWidth * cameraScale * 1.2,
        height: cameraHeight * cameraScale * 1.2
      });
    }
  }
  $('#humanity-game-scene').hide();
  $('#continue-game-result').show();
  $('#continue-game-panel').addClass('d-flex');
}

var humanityEndGame = function () {
  $('#btn-exit-game').prop('disabled', false);
  $('.camera-container').css({
    width: cameraContainerWidth,
    height: cameraContainerWidth
  }).find('video').css({
    width: cameraWidth,
    height: cameraHeight
  });
  $('.camera-item').appendTo('#cameras-container');
  $('#cameras-container').show();
  $('#humanity-game-scene').hide();
  $('#continue-game-panel').removeClass('d-flex');
  $('#globalConfettiCanvas').hide();
}

$('body').on('click', '.select-white-card:not(.disabled)', function () {
  $('.select-white-card').addClass('disabled');
  $(this).removeClass('bg-white').addClass('text-white bg-success');
  selectCardAudio.play();
  sendMessage({
    type: 'choose-white-card',
    data: $(this).text()
  });
});

$('body').on('click', '.select-review-card:not(.disabled)', function () {
  $('.select-review-card').addClass('disabled');
  $(this).removeClass('bg-white').addClass('text-white bg-success');
  selectCardAudio.play();
  sendMessage({
    type: 'choose-review-card',
    data: $(this).text()
  });
});
