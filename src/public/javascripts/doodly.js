var pencilColors = [
  [0, 0, 0],
  [158, 111, 41],
  [245, 159, 10],
  [226, 226, 19],
  [90, 207, 113],
  [121, 215, 235],
  [232, 160, 241],
  [199, 113, 241],
  [23, 126, 229],
  [222, 32, 32],
];
var selectedColor = 0; // index of pencilColors
var selectedTool = 'pencil';
var doodlyTime = 80; // 80s per round
var doodlySketch;
var sketch;
var doodlyWords = [];
var doodlyRounds = 0;
var doodlyCurRound = 0;
var painterId;
var selectedWord;
var correctGuessCnt = 0;
var doodlyPoint = 10; // point per round
var doodlyRoundState;
var choosingWordTime = 7000; // 7s for choosing a word
var choseWord = false; // variable for state of choosing a word
var correctAudio = new Audio('/sounds/correct.mp3');
correctAudio.volume = 0.25;
var tickingSound = new Audio('/sounds/doodly/clock.mp3');
tickingSound.volume = 1;
var tickingTime = 10; // ticking clock sound when the time is remained 10s
var sketchWidth = {}; // Skecth per player, it's for scaling draw
var chooseWordSound = new Audio('/sounds/doodly/click.mp3');
var startRoundSound = new Audio('/sounds/doodly/timer-start.mp3');
var gameoverSound = new Audio('/sounds/doodly/gameover.mp3');

var initDoodlyGame = function (round = 0, pointsData = {}, start = true) {
  if (acceptedCount < 7) {
    cameraScale = $('body').width() / 10 / cameraContainerWidth;
  } else {
    cameraScale = $('body').width() / 15 / cameraContainerWidth;
  }
  $('.camera-item').appendTo('#cameras-container');
  $('.camera-item').filter(function () {
    return gamePlayerIds.includes($(this).attr('id'));
  }).each(function () {
    if (!$(this).find('.pointer-state').length) {
      $(this).append('<span class="pointer-state">0 points</span>');
      $(this).append('<span class="guessing-word">');
      $(this).append('<i class="fa fa-check text-success correct-guess d-none">');
    }
    $(this).appendTo('#doodly-cameras-container');
  });
  $('#doodly-cameras-container .camera-container').css({
    width: cameraContainerWidth * cameraScale,
    height: cameraContainerWidth * cameraScale,
  }).find('video').css({
    width: cameraWidth * cameraScale,
    height: cameraHeight * cameraScale
  });

  doodlySketch = p => {
    p.setup = function () {
      var W = window.innerWidth * 0.5;
      var H = W / 3;

      // if (H * 2 < W) {
      //   W = H * 2;
      // } else {
      //   H = W / 2;
      // }

      p.createCanvas(W, H);
    };

    p.mouseDragged = function () {
      if (ownId != painterId || doodlyRoundState != 'painting') {
        return;
      }
      var data = {
        x: p.mouseX,
        y: p.mouseY,
        px: p.pmouseX,
        py: p.pmouseY,
        gameRoomId: gameRoomId
      };
      sendMessage({
        type: 'drawing',
        data: data
      });
    }
  };

  doodlyCurRound = round;
  // points = pointsData;
  for (playerId of gamePlayerIds) {
    points[playerId] = 0;
  }
  clearInterval(timer);
  if (sketch) {
    doodlyRemoveSketch();
  }
  sketch = new p5(doodlySketch, 'doodly-canvas-container');

  $('.choose-color').each(function (idx) {
    $(this).css('background', 'rgb(' + pencilColors[idx].join(', ') + ')')
  });

  $('#doodly-game-scene').show();
  $('#continue-game-panel').removeClass('d-flex');
  $('#cameras-container').hide();

  if (start) {
    $('#doodly-game-scene .wating-next-round').hide();
    doodlyStartNewRound(round);
  } else {
    $('#doodly-game-scene .wating-next-round').show();
  }
  $('#doodly-canvas-container').hide();

  // Send own sketch width
  sendMessage({
    type: 'sketch-width',
    data: {
      id: ownId,
      width: sketch.width,
      gameRoomId: gameRoomId
    }
  });
}

var setPlayerSketchWidth = function (data) {
  sketchWidth[data.id] = data.width;
}

var doodlyStartNewRound = function (round = 0) {
  doodlyCurRound = round;
  clearInterval(timer);
  clearTimeout(timer);
  doodlyClearSketch();
  doodlyChangeColor(0);
  if (doodlyCurRound >= doodlyRounds) {
    doodlyShowResult();
    return;
  }
  $('.guessing-word').hide();
  $('.correct-guess').addClass('d-none').removeClass('d-block');
  $('#selected-word').hide();
  $('.choose-tool').removeClass('disabled');
  correctGuessCnt = 0;
  painterId = gamePlayerIds[doodlyCurRound % acceptedCount];
  doodlyRoundState = '';
  $('.choose-color.selected').removeClass('selected');
  $('.choose-color').eq(0).addClass('selected');
  if (painterId == ownId) {
    choseWord = false;
    var words = doodlyWords.slice(doodlyCurRound * 3, doodlyCurRound * 3 + 3);
    $('.choose-word').each(function (idx) {
      $(this).text(words[idx]);
    });
    $('#choose-word-container').show();
    timer = setTimeout(function () {
      if (choseWord) {
        clearTimeout(timer);
        return;
      }
      choseWord = true;
      const randomNum = Math.round(Math.random() * 100) % 3;
      sendMessage({
        type: 'select-word',
        data: {
          gameRoomId: gameRoomId,
          word: $('.choose-word').eq(randomNum).text()
        }
      });
      $('#choose-word-container').hide();
    }, choosingWordTime);

    $("#doodly-answer-container").addClass('d-none').removeClass('d-flex');
  } else {
    $('#choose-word-container').hide();
    // $('#selected-word').removeClass('unknown').show().text(playerInfoList[painterId].name + ' is picking a word.');

    $("#doodly-answer").text(selectedWord || '________');
    $('#doodly-painer-name').text(playerInfoList[painterId].name);

    var sortable = [];
    for (var playerId in points) {
      if (gamePlayerIds.includes(playerId)) {
        var playerName = playerInfoList[playerId].name;
        sortable.push([playerName, points[playerId], playerId]);
      }
    }
    sortable.sort(function (a, b) {
      return b[1] - a[1];
    });

    $('#doodly-result .d-flex').remove();
    for (i = 0; i < sortable.length; i++) {
      $('#doodly-result').append('<div class="d-flex justify-content-between mb-1"><span>' + sortable[i][0] + '</span><b class="ml-3">' + sortable[i][1] + '</b></div>');
    }
    $('#doodly-result .d-flex:eq(0)').addClass('text-primary');
    $("#doodly-answer-container").addClass('d-flex').removeClass('d-none');
  }

  $('#choose-color-container').removeClass('d-flex').addClass('d-none');
  // $('#guess-word-input').hide();
  curTime = doodlyTime;
  $('#doodly-time-bar').removeClass('bg-warning bg-danger').addClass('bg-success').css('width', '100%');

  $('#doodly-canvas-container').hide();
  startRoundSound.play();
}

var doodlyDrawing = function (data) {
  data.x *= sketchWidth[ownId] / sketchWidth[painterId];
  data.y *= sketchWidth[ownId] / sketchWidth[painterId];
  data.px *= sketchWidth[ownId] / sketchWidth[painterId];
  data.py *= sketchWidth[ownId] / sketchWidth[painterId];
  sketch.line(data.x, data.y, data.px, data.py);
}

var doodlyRemoveSketch = function () {
  sketch.remove();
}

var doodlyClearSketch = function () {
  sketch.clear();
}

var doodlyShowResult = function () {
  $('#btn-exit-game').prop('disabled', false);
  doodlyRemoveSketch();
  $('#choose-color-container').removeClass('d-flex').addClass('d-none');
  $('.camera-container').css({
    width: cameraContainerWidth,
    height: cameraContainerWidth
  }).find('video').css({
    width: cameraWidth,
    height: cameraHeight
  });
  $('#guess-word-input').hide();
  $('#doodly-game-scene').hide();
  $('.pointer-state').remove();
  $('.guessing-word').remove();
  $('.correct-guess').remove();
  $('#doodly-cameras-container .camera-item').appendTo('#continue-game-cameras-container');
  $('#continue-game-result .d-flex').remove();

  $('#doodly-canvas-container').hide();

  var sortable = [];
  for (var playerId in points) {
    if (gamePlayerIds.includes(playerId)) {
      var playerName = playerInfoList[playerId].name;
      sortable.push([playerName, points[playerId], playerId]);
    }
  }
  sortable.sort(function (a, b) {
    return b[1] - a[1];
  });

  for (i = 0; i < sortable.length; i++) {
    $('#continue-game-result').append('<div class="d-flex justify-content-between mb-1"><span>' + sortable[i][0] + '</span><span>' + sortable[i][1] + '</span></div>');
    if (sortable[0][1] == sortable[i][1]) {
      if (sortable[i][2] == ownId) {
        sendMessage({
          type: 'winner'
        });

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
  $('#continue-game-result').show();
  $('#continue-game-panel').addClass('d-flex');

  gameoverSound.play();
}

var doodlyEndGame = function () {
  $('.camera-container').css({
    width: cameraContainerWidth,
    height: cameraContainerWidth
  }).find('video').css({
    width: cameraWidth,
    height: cameraHeight
  });
  $('.camera-item').appendTo('#cameras-container');
  $('#cameras-container').show();
  $('#doodly-game-scene').hide();
  $('#continue-game-panel').removeClass('d-flex');
  $('#globalConfettiCanvas').hide();
}

var doodlyChangeColor = function (color) {
  selectedColor = color;
  sketch.color(pencilColors[selectedColor]);
  sketch.stroke(pencilColors[selectedColor]);
  sketch.strokeWeight(sketch.width / 100);
}

var doodlyChangeTool = function (tool) {
  if (tool == 'erase') {
    sketch.color([255, 255, 255]);
    sketch.stroke([255, 255, 255]);
    sketch.strokeWeight(sketch.width / 50);
  } else {
    if (tool == 'trash') {
      doodlyClearSketch();
    }
    selectedTool = 'pencil';
    sketch.color(pencilColors[selectedColor]);
    sketch.stroke(pencilColors[selectedColor]);
    sketch.strokeWeight(sketch.width / 100);
  }
}

var doodlySelectWord = function (word) {
  selectedWord = word;
  if (painterId == ownId) {
    $('#selected-word').removeClass('unknown').show().text(word);
    $('#choose-color-container').removeClass('d-none').addClass('d-flex');
    $('#guess-word-input').hide();
    doodlyRoundState = 'painting';
  } else {
    $('#selected-word').addClass('unknown').show().text(word.replaceAll(/\S{1}/ig, '_'));
  }
  doodlyFinishDrawing();
  $('#doodly-canvas-container').show();
  $("#doodly-answer-container").addClass('d-none').removeClass('d-flex');
}

var doodlyFinishDrawing = function () {
  clearTimeout(timer);
  timer = setInterval(function () {
    var percent = curTime-- / doodlyTime * 100;
    $('#doodly-time-bar').removeClass('bg-success bg-warning bg-danger').css('width', `${percent}%`);
    if (percent > 75) {
      $('#doodly-time-bar').addClass('bg-success');
    } else if (percent > 50) {
      $('#doodly-time-bar').addClass('bg-warning');
    } else {
      $('#doodly-time-bar').addClass('bg-danger');
    }
    if (curTime < tickingTime && ownId != painterId) {
      tickingSound.play();
    }
    if (curTime < 0) {
      tickingSound.pause();
      clearInterval(timer);
      clearTimeout(timer);
      doodlyCurRound++;
      // if (!tickingSound.paused) tickingSound.pause();
      if (gameManager) {
        timer = setTimeout(function () {
          sendMessage({
            type: 'doodly-new-round',
            data: {
              round: doodlyCurRound,
            }
          });
        }, 3000);
      }
    }
  }, 1000);
  if (painterId != ownId) {
    $('#guess-word-input').val('').show();
  }
}

var doodlyWrongGuess = function (data) {
  $('#' + data.playerId).find('.guessing-word').show().text(data.word);
}

var doodlyCorrectGuess = function (data) {
  $('#' + data.playerId).find('.correct-guess').removeClass('d-none').addClass('d-block');
  if (points[data.playerId]) {
    points[data.playerId] += data.point;
  } else {
    points[data.playerId] = data.point;
  }
  $('#' + data.playerId).find('.pointer-state').text(points[data.playerId] + ' points');
  correctGuessCnt++;
  doodlyCheckTimer();
}

var doodlyCheckTimer = function () {
  if (correctGuessCnt >= acceptedCount - 1) {
    clearInterval(timer);
    clearTimeout(timer);
    timer = setTimeout(function () {
      clearInterval(timer);
      doodlyCurRound++;
      sendMessage({
        type: 'doodly-new-round',
        data: {
          round: doodlyCurRound,
        }
      });
    }, 2000);
  }
  else if (correctGuessCnt >= (acceptedCount - 1) / 3 * 2 && curTime > 10) {
    curTime = 10;
  } else if (correctGuessCnt >= (acceptedCount - 1) / 3 && curTime > 30) {
    curTime = 30;
  }
}

$('.choose-color').click(function () {
  $('.choose-color.selected').removeClass('selected');
  $(this).addClass('selected');
  sendMessage({
    type: 'change-color',
    data: {
      gameRoomId: gameRoomId,
      color: $(this).index()
    }
  });
});

$('.choose-tool').click(function () {
  $('.choose-tool.selected').removeClass('selected');
  if ($(this).data('tool') == 'trash') {
    $('.choose-tool[data-tool=pencil]').addClass('selected');
  } else {
    $(this).addClass('selected');
  }
  sendMessage({
    type: 'change-tool',
    data: {
      gameRoomId: gameRoomId,
      tool: $(this).data('tool')
    }
  });
});

$('.choose-word').click(function () {
  if (choseWord) {
    return;
  }
  choseWord = true;
  sendMessage({
    type: 'select-word',
    data: {
      gameRoomId: gameRoomId,
      word: $(this).text()
    }
  });
  $('#choose-word-container').hide();
  chooseWordSound.play();
});

$('#guess-word-input').keypress(function (e) {
  if ($(this).val() && e.keyCode == 13) {
    if ($(this).val().trim().toLowerCase() == selectedWord.trim().toLowerCase()) {
      correctAudio.play();
      $(this).blur().hide();
      const point = Math.floor(doodlyPoint * (1 + (2 - correctGuessCnt) / 10)) * 10;
      sendMessage({
        type: 'correct-guess',
        data: {
          gameRoomId: gameRoomId,
          playerId: ownId,
          point: point,
          word: $(this).val(),
          selectedWord: selectedWord
        }
      });
    } else {
      sendMessage({
        type: 'game-msg',
        data: $(this).val(),
      });
      $(this).val('');
    }
  }
});

$('body').on('click', '.p5Canvas', function (e) {
  e.stopPropagation();
});

$(document).keypress(function (e) {
  if (painterId != ownId) {
    $('#guess-word-input').focus();
  }
});
