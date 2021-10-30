var guessWhoCurRound;
var myStatements = [];
var votedCount = 0;
var guessWhoResult = {};

var initGuessWhoGame = function (data) {
  if (acceptedCount < 7) {
    cameraScale = $('body').width() / 10 / cameraContainerWidth;
  } else {
    cameraScale = $('body').width() / 15 / cameraContainerWidth;
  }
  $('.votes-cnt').remove();
  $('.camera-item').appendTo('#cameras-container');
  $('.camera-item').filter(function () {
    return gamePlayerIds.includes($(this).attr('id'));
  }).each(function () {
    $(this).append('<span class="votes-cnt">0</span>');
    $(this).appendTo('#guess-who-cameras-container');
  });
  $('#guess-who-cameras-container .camera-container').css({
    width: cameraContainerWidth * cameraScale,
    height: cameraContainerWidth * cameraScale,
  }).find('video').css({
    width: cameraWidth * cameraScale,
    height: cameraHeight * cameraScale
  });
  $('#guess-who-waiting').hide();
  $('#guess-who-write-statements').removeClass('d-none').addClass('d-flex');
  $('#guess-who-vote-container').removeClass('d-flex').addClass('d-none');
  $('#guess-who-choose-name-container .choose-name').remove();
  gamePlayerIds.forEach(playerId => {
    if (playerId == ownId) {
      return
    }
    var player = playerInfoList[playerId];
    $(`<a class="choose-name">${player.name}</a>`).data('playerId', playerId).appendTo('#guess-who-choose-name-container')
  });
  $('#guess-who-write-statements input').each(_ => {
    $(this).val('');
  });
  $('#guess-who-write-statements input').val('')

  $('#guess-who-game-scene').show();
};

var guessWhoStartNewRound = function (round = 0, statement) {
  $('#guess-who-waiting').hide();
  $('#guess-who-write-statements').removeClass('d-flex').addClass('d-none');
  $('#guess-who-vote-container').addClass('d-flex').removeClass('d-none');
  if (myStatements.includes(statement)) {
    $('#guess-who-votes').hide();
  } else {
    $('#guess-who-votes').show();
  }
  $('#guess-who-vote-container h1').text(statement);
  $('#next-guess-round').hide();
  $('.choose-name').removeClass('disabled choose');
  $('.votes-cnt').hide();
  guessWhoCurRound = round;
  votedCount = 0;
  guessWhoResult = {};
};

var guessWhoEndGame = function () {
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
  $('#guess-who-game-scene').hide();
  $('.votes-cnt').remove();
};

var guessWhoDuplicateStatement = function (num) {
  $.notify('Please input another instead of ' + $(`#guess-who-write-statements input:eq(${num})`).val(), {
    type: 'danger'
  });
};

var guessWhoFinishInput = function (playerId) {
  if (playerId == ownId) {
    $('#guess-who-write-statements').addClass('d-none').removeClass('d-flex');
    $('#guess-who-waiting').show();
  }
};

var guessWhoVote = async function (data) {
  votedCount++;
  if (guessWhoResult[data.playerId]) {
    guessWhoResult[data.playerId]++;
  } else {
    guessWhoResult[data.playerId] = 1;
  }
  if (votedCount >= acceptedCount - 1) {
    $('.votes-cnt').text(0).show();
    var playerId = null, maxCnt = -1, winnerCnt = 0;
    for (const pId in guessWhoResult) {
      if (guessWhoResult[pId] > maxCnt) {
        maxCnt = guessWhoResult[pId];
        playerId = pId;
      }

      $(`#${pId} .votes-cnt`).text(guessWhoResult[pId]);
    }
    for (const pId in guessWhoResult) {
      if (guessWhoResult[pId] == maxCnt) {
        winnerCnt++;
      }
    }

    if (winnerCnt == 1) {
      var $cameraContainer = $('#' + playerId).find('.camera-container');
      $cameraContainer.animate({
        width: cameraContainerWidth * 1.5,
        height: cameraContainerWidth * 1.5
      }, 500).find('video').animate({
        width: cameraWidth * 1.5,
        height: cameraHeight * 1.5
      }, 500);
      await sleep(2000);
  
      $cameraContainer.animate({
        width: cameraContainerWidth,
        height: cameraContainerWidth
      }, 300).find('video').animate({
        width: cameraWidth,
        height: cameraHeight
      }, 300);
      await sleep(500);
      if (gameManager) {
        $('#guess-who-votes').hide();
        $('#next-guess-round').show();
      }
    } else {
      await sleep(500);
      if (gameManager) {
        $('#guess-who-votes').hide();
        $('#next-guess-round').show();
      }
    }
  }
}

$('#guess-who-finish-write').click(function () {
  var state1 = $('#guess-who-write-statements input:eq(0)').val();
  var state2 = $('#guess-who-write-statements input:eq(1)').val();
  var state3 = $('#guess-who-write-statements input:eq(2)').val();

  if (!state1 || !state2 || !state3 || state1 == state2 || state1 == state3 || state2 == state3) {
    $.notify('Please enter correctly', {
      type: 'danger'
    });
    return;
  }

  myStatements = [state1, state2, state3];
  sendMessage({
    type: 'guess-who-finish-input',
    data: myStatements
  });
});

$('#guess-who-game-scene').on('click', '.choose-name:not(.disabled)', function (e) {
  e.preventDefault();
  sendMessage({
    type: 'guess-who-vote',
    data: {
      round: guessWhoCurRound,
      playerId: $(this).data('playerId'),
      gameRoomId: gameRoomId
    }
  });
  $(this).addClass('choose disabled');
  $('#guess-who-game-scene .choose-name').addClass('disabled');
  return false;
});

$('#next-guess-round').click(function () {
  sendMessage({
    type: 'guess-who-new-round',
    data: guessWhoCurRound
  })
});