var cameraPostions = {
  2: [4, 5],
  3: [4, 5, 8],
  4: [4, 5, 6, 8],
  5: [3, 4, 5, 7, 8],
  6: [3, 4, 5, 6, 7, 8],
  7: [2, 3, 4, 5, 7, 8, 10],
  8: [2, 3, 4, 5, 6, 7, 8, 10],
  9: [1, 2, 3, 4, 5, 7, 8, 9, 10],
  10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

var questions = [];
var questionNum = 0;
var whoIsTime = 15; // 15s per question
var whoIsResult = [];
var votedCount = 0;
var whoIsResultTime = 5000; // 5s for showing each result

var whoIsCalcWidth = function () {
  cameraScale = $('body').height() / 4 / cameraContainerWidth;

  $('#who-is-game-scene .camera-container').css({
    width: cameraContainerWidth * cameraScale,
    height: cameraContainerWidth * cameraScale
  }).find('video').css({
    width: cameraWidth * cameraScale,
    height: cameraHeight * cameraScale
  });
}

var initWhoIsGame = function (round = 0, start = true) {
  colors = ['rgb(246, 186, 46)', 'rgb(81, 207, 255)', 'rgb(216, 107, 107)', 'rgb(189, 209, 8)', 'rgb(124, 197, 134)', 'rgb(209, 121, 168)', 'rgb(163, 175, 254)', 'rgb(136, 200, 255)', 'rgb(53, 190, 200)', 'rgb(214, 141, 222)'];

  shuffle(colors);
  clearInterval(timer);
  $('#who-is-game-scene').show();
  $('#continue-game-panel').removeClass('d-flex');
  $('#choose-name-panel').show();
  $('#choose-name-panel .choose-name').remove();
  $('#cameras-container').hide();
  var cameraPostionList = cameraPostions[acceptedCount];
  $('.camera-item').appendTo('#cameras-container');
  $('.camera-item').filter(function () {
    return gamePlayerIds.includes($(this).attr('id'));
  }).sort(function (a, b) {
    return gamePlayerIds.indexOf($(a).attr('id')) < gamePlayerIds.indexOf($(b).attr('id'));
  }).each(function (idx) {
    $(this).data('pos', cameraPostionList[idx]).appendTo($('.who-is-camera-' + cameraPostionList[idx]));
    if (start) {
      const playerId = $(this).attr('id');
      $('.choose-name-clone').clone().removeClass('choose-name-clone d-none').addClass('choose-name').data('playerId', playerId).text(playerInfoList[playerId].name.split(' ')[0]).data("index", idx).appendTo('#choose-name-panel');
    }
  });

  whoIsCalcWidth();
  questionNum = round;

  if (start) {
    whoIsStartNewRound(round);
  } else {
    $('#who-is-game-scene').css('backgroundColor', colors[round % colors.length]);
    $('#question').text(questions[questionNum].question);
    $('#who-is-game-scene .wating-next-round').show();
  }
}

var whoIsStartNewRound = function (round = 0) {
  $('#who-is-game-scene .wating-next-round').hide();
  questionNum = round;
  curTime = whoIsTime;
  votedCount = 0;
  clearInterval(timer);
  if (questionNum >= questions.length) {
    whoIsShowResultInterval();
    return;
  }
  $('#who-is-game-scene').css('backgroundColor', colors[round % colors.length]);
  $('#who-is-game-scene .game-timer').text(curTime-- + 's');
  $('#question').text(questions[questionNum].question);
  $('#question-state').text('Question ' + (questionNum + 1) + ' of ' + questions.length).show();
  $('.choose-name').removeClass('disabled choose');
  $('.choose-name').css('color', colors[round % colors.length]);
  timer = setInterval(function () {
    if (curTime < 0) {
      questionNum++;
      sendMessage({
        type: 'who-is-new-round',
        data: {
          round: questionNum,
          gameRoomId: gameRoomId
        }
      });
      clearInterval(timer);
    } else {
      $('#who-is-game-scene .game-timer').text(curTime-- + 's');
    }
  }, 1000);
}

var whoIsShowResultInterval = function () {
  $('#btn-exit-game').prop('disabled', false);
  clearInterval(timer);
  $('#who-is-game-scene .game-timer').text('');
  $('#choose-name-panel').hide();
  $('#question-state').hide();
  for (i = 0; i < whoIsResult.length; i++) {
    var result = whoIsResult[i];
    var playerId = null, maxCnt = -1, winnerCnt = 0;
    for (const pId in result) {
      if (result[pId] > maxCnt) {
        maxCnt = result[pId];
        playerId = pId;
      }
    }
    for (const pId in result) {
      if (result[pId] == maxCnt) {
        winnerCnt++;
      }
    }
    if (winnerCnt == 1 && playerId && gamePlayerIds.includes(playerId)) {
      whoIsResult[i] = playerId;
    } else {
      questions.splice(i, 1);
      whoIsResult.splice(i, 1);
      i--;
    }
  }
  if (whoIsResult.length) {
    questionNum = 0;
    whoIsShowResult();
    timer = setInterval(function () {
      questionNum++;
      if (questionNum < whoIsResult.length) {
        whoIsShowResult();
      } else {
        clearInterval(timer);
        whoIsShowContinueGame();
      }
    }, whoIsResultTime);
  } else {
    whoIsShowContinueGame();
  }
}

var whoIsShowResult = function () {
  var answer = questions[questionNum].answer;
  whoIsShowWinner(whoIsResult[questionNum]);
  $('#question').text(answer.replace('...', playerInfoList[whoIsResult[questionNum]].name));
  $('#who-is-game-scene').css('backgroundColor', colors[questionNum % colors.length]);
}

var whoIsShowWinner = function (winnerId) {
  if (!winnerId) {
    return;
  }

  $.confetti.restart('globalConfettiCanvas');
  var $winner = $('#' + winnerId);
  if ($winner.parents('.winner-pos').length == 0) {
    $('.winner-pos').find('.camera-item').appendTo('.who-is-camera-' + $winner.data('pos'));
    $winner.appendTo('.winner-pos');
  }
  var $cameraContainer = $('#' + winnerId).find('.camera-container');
  if (acceptedCount < 7) {
    $('.who-is-camera-container-2, .who-is-camera-container-4').addClass('justify-content-end');
  } else {
    $('.who-is-camera-container-2, .who-is-camera-container-4').addClass('justify-content-center');
  }
  $cameraContainer.animate({
    width: cameraContainerWidth * cameraScale * 1.5,
    height: cameraContainerWidth * cameraScale * 1.5
  }, 500).find('video').animate({
    width: cameraWidth * cameraScale * 1.5,
    height: cameraHeight * cameraScale * 1.5
  }, 500);

  setTimeout(function () {
    $cameraContainer.animate({
      width: cameraContainerWidth * cameraScale,
      height: cameraContainerWidth * cameraScale
    }, 300, function () {
      $('.who-is-camera-' + $winner.data('pos')).find('.camera-item').appendTo('.winner-pos');
      $winner.appendTo('.who-is-camera-' + $winner.data('pos'));
      $('.who-is-camera-container-2, .who-is-camera-container-4').removeClass(['justify-content-center', 'justify-content-end']);
    }).find('video').animate({
      width: cameraWidth * cameraScale,
      height: cameraHeight * cameraScale
    }, 300);
    $.confetti.stop();
  }, 2000);
}

var whoIsShowContinueGame = function () {
  $('.camera-container').css({
    width: cameraContainerWidth,
    height: cameraContainerWidth
  }).find('video').css({
    width: cameraWidth,
    height: cameraHeight
  });
  $('#who-is-game-scene').hide();
  $('#who-is-game-scene .camera-item').appendTo('#continue-game-cameras-container');
  $('#continue-game-result .d-flex').remove();
  $('#continue-game-result').hide();
  $('#continue-game-panel').addClass('d-flex');
  $('#globalConfettiCanvas').hide();
  $('#winnerConfettiCanvas').hide();
}

var whoIsEndGame = function () {
  $('#who-is-game-scene .camera-container').css({
    width: cameraContainerWidth,
    height: cameraContainerWidth
  }).find('video').css({
    width: cameraWidth,
    height: cameraHeight
  });
  $('.camera-item').appendTo('#cameras-container');
  $('#cameras-container').show();
  $('#who-is-game-scene').hide();
  $('#continue-game-panel').removeClass('d-flex');
}

var whoIsVotePerson = function (data) {
  if (!whoIsResult[data.num]) {
    whoIsResult[data.num] = {};
  }
  if (!whoIsResult[data.num][data.playerId]) {
    whoIsResult[data.num][data.playerId] = 1;
  } else {
    whoIsResult[data.num][data.playerId]++;
  }
  votedCount++;
  if (votedCount >= acceptedCount) {
    questionNum++;
    var result = whoIsResult[data.num];
    var playerId = null, maxCnt = -1, winnerCnt = 0;
    for (const pId in result) {
      if (result[pId] > maxCnt) {
        maxCnt = result[pId];
        playerId = pId;
      }
    }
    for (const pId in result) {
      if (result[pId] == maxCnt) {
        winnerCnt++;
      }
    }
    sendMessage({
      type: 'who-is-new-round',
      data: {
        round: questionNum,
        gameRoomId: gameRoomId,
        winner: winnerCnt == 1 ? playerId : null
      }
    });
  }
}

$('#who-is-game-scene').on('click', '.choose-name:not(.disabled)', function (e) {
  e.preventDefault();
  sendMessage({
    type: 'who-is-vote',
    data: {
      num: questionNum,
      playerId: $(this).data('playerId'),
      gameRoomId: gameRoomId
    }
  });
  $(this).addClass('choose disabled');
  $('#who-is-game-scene .choose-name').addClass('disabled');
  return false;
});