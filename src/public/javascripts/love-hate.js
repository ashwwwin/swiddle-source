var selectedState;
var loveHateCurRound;

var initLoveHateGame = function (data, start=true) {
  colors = ['rgb(82, 222, 147)', 'rgb(62, 207, 217)', 'rgb(233, 192, 87)', 'rgb(255, 104, 177)', 'rgb(254, 106, 106)', 'rgb(190, 167, 239)', 'rgb(55, 216, 138)', 'rgb(255, 185, 80)', 'rgb(48, 190, 173)', 'rgb(171, 206, 97)'];
  shuffle(colors);
  questions = data.questions;
  if (acceptedCount < 7) {
    cameraScale = $('body').width() / 10 / cameraContainerWidth;
  } else {
    cameraScale = $('body').width() / 15 / cameraContainerWidth;
  }
  $('.camera-item').appendTo('#cameras-container');
  $('.camera-item').filter(function () {
    return gamePlayerIds.includes($(this).attr('id'));
  }).each(function () {
    $(this).appendTo('#love-hate-cameras-container');
  });
  $('#love-hate-cameras-container .camera-container').css({
    width: cameraContainerWidth * cameraScale,
    height: cameraContainerWidth * cameraScale,
  }).find('video').css({
    width: cameraWidth * cameraScale,
    height: cameraHeight * cameraScale
  });
  $('#love-hate-game-scene').show();
  if (start) {
    $('#love-hate-game-scene .wating-next-round').hide();
    loveHateStartNewRound(data.round);
  } else {
    $('#love-hate-question').text(questions[data.round]);
    $('#love-hate-game-scene').css('backgroundColor', colors[data.round % colors.length]);
    $('#love-hate-game-scene .wating-next-round').show();
  }
};

var loveHateStartNewRound = function (round = 0) {
  if (round >= questions.length) {
    loveHateEndGame();
    return;
  }
  selectedState = {};
  loveHateCurRound = round;
  $('#love-hate-result').removeClass('d-flex').addClass('d-none');
  $('#love-hate-buttons').removeClass('d-none').addClass('d-flex');
  $('#love-hate-game-scene').css('backgroundColor', colors[round % colors.length]);
  $('#btn-love-hate-next').css('color', colors[round % colors.length]).hide();
  $('#love-hate-question').text(questions[round]);
};

var chooseState = function (data) {
  selectedState[data.playerId] = data.state;
  var endGame = true;
  var playerIds = Object.keys(selectedState);
  for (playerId of gamePlayerIds) {
    if (!playerIds.includes(playerId)) {
      endGame = false;
      return;
    }
  }
  if (endGame) {
    loveHateShowResult();
  }
};

var loveHateShowResult = async function () {
  $('#love-hate-result').addClass('d-flex').removeClass('d-none').find('h5').remove();
  var lovePlayerIds = [];
  var hatePlayerIds = [];
  for (playerId in selectedState) {
    if (selectedState[playerId] == 'love') {
      lovePlayerIds.push(playerId);
    } else {
      hatePlayerIds.push(playerId);
    }
  }
  var maxCnt = Math.max(lovePlayerIds.length, hatePlayerIds.length);
  for (i=0; i<maxCnt; i++) {
    if (lovePlayerIds[i]) {
      var $love = $('<h5>').text(playerInfoList[lovePlayerIds[i]].name);
      $('#love-result').append($love);
    }
    if (hatePlayerIds[i]) {
      var $hate = $('<h5>').text(playerInfoList[hatePlayerIds[i]].name);
      $('#hate-result').append($hate);
    }
    await sleep(100);
    if ($love) {
      $love.addClass('animate');
    }
    if ($hate) {
      $hate.addClass('animate');
    }
    await sleep(1500);
  }
  if (gameManager) {
    $('#btn-love-hate-next').show();
  }
}

var loveHateEndGame = function () {
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
  $('#love-hate-game-scene').hide();
};

$(function () {
  $('.btn-love-hate').click(function () {
    sendMessage({
      type: 'choose-state',
      data: $(this).data('state')
    });
    $('#love-hate-buttons').addClass('d-none').removeClass('d-flex');
  });

  $('#btn-love-hate-next').click(function () {
    sendMessage({
      type: 'love-hate-new-round',
      data: loveHateCurRound,
    });
  });
});