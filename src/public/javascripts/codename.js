var codenameWords = [];
var codenameState;
var codenameCurrentTeam;
var myCodenameTeam;
var isSpyMaster = false;
var waitingSpyMaster = true;
var spyMasters;
var codenameTeam;

function initCodenameGame(data) {
  $('.codename-card.flipped').removeClass('flipped');
  $('.codename-card .back').removeClass('red blue netural death');
  $('#clue-input-container').hide();

  isSpyMaster = false;
  waitingSpyMaster = true;

  codenameWords = data.words;
  if (acceptedCount < 7) {
    cameraScale = $('body').width() / 10 / cameraContainerWidth;
  } else {
    cameraScale = $('body').width() / 15 / cameraContainerWidth;
  }
  $('.camera-item').appendTo('#cameras-container');
  $('.camera-item').filter(function () {
    return gamePlayerIds.includes($(this).attr('id'));
  }).each(function () {
    $(this).append('<span class="votes-cnt">0</span>');
    $(this).appendTo('#codename-cameras-container');
  });
  $('#codename-cameras-container .camera-container').css({
    width: cameraContainerWidth * cameraScale,
    height: cameraContainerWidth * cameraScale,
  }).find('video').css({
    width: cameraWidth * cameraScale,
    height: cameraHeight * cameraScale
  });

  codenameState = 'start';
  codenameCurrentTeam = data.currentTeam;
  myCodenameTeam = data.team[ownId];
  codenameTeam = data.team;

  spyMasters = data.spyMasters;
  if (spyMasters[myCodenameTeam] == ownId) {
    isSpyMaster = true;
  }

  $('#wordsTable .codename-card').each(function (idx) {
    $(this).find('.front').text(codenameWords[idx].word);
    if (isSpyMaster) {
      $(this).find('.front').addClass(codenameWords[idx].type);
    }
    $(this).children('.back').addClass(codenameWords[idx].type);
  });

  for (playerId in data.team) {
    $(`#${playerId}`).appendTo(`#codename-cameras-container .${data.team[playerId]}Team`);
    //  .camera-container`).removeClass('redTeam blueTeam')
    //   .addClass(`${data.team[playerId]}Team`);
  }

  $('#codename-game-scene').show();

  if (codenameCurrentTeam == myCodenameTeam) {
    if (isSpyMaster) {
      $('#clue-display').hide();
      $('#clue-input-container').show();
    } else {
      $('#clue-input-container').hide();
      $('#clue-display').show().html(`<span class="text-success">Waiting for ${playerInfoList[spyMasters[myCodenameTeam]].name}</span>`);
    }
  } else {
    $('#clue-input-container').hide();
    $('#clue-display').show().html(`<span>It's their turn</span>`);
  }
}

function codeFlip(data) {
  $(`.codename-card[data-pos=${data.pos}]`).addClass('flipped');
  // $('#codenameRedScore .score').text(data.score.red);
  // $('#codenameBlueScore .score').text(data.score.blue);
  if (data.state == 'end') {
    codenameState = 'end';
    setTimeout(() => {
      $('.camera-container').css({
        width: cameraContainerWidth,
        height: cameraContainerWidth
      }).find('video').css({
        width: cameraWidth,
        height: cameraHeight
      });
      $('#codename-cameras-container .camera-item').appendTo('#continue-game-cameras-container');
      $('#codename-game-scene').hide();
      $('#continue-game-result .d-flex').remove();
      playerNames = [];
      for (playerId in codenameTeam) {
        if (codenameTeam[playerId] == data.currentTeam && playerInfoList[playerId]) {
          playerNames.push(playerInfoList[playerId].name);
        }
      }
      $('#continue-game-result').append(`<div class="text-success text-left mb-1">Win: ${playerNames.join(', ')}<span>`);
      playerNames = [];
      for (playerId in codenameTeam) {
        if (codenameTeam[playerId] != data.currentTeam && playerInfoList[playerId]) {
          playerNames.push(playerInfoList[playerId].name);
        }
      }
      $('#continue-game-result').append(`<div class="text-danger text-left mb-1">Lose: ${playerNames.join(', ')}<span>`);
      $('#continue-game-result').show();
      $('#continue-game-panel').addClass('d-flex');
    }, 1000);
  }
  codenameCurrentTeam = data.currentTeam;
  // $('#codename-game-scene').removeClass('redTeam blueTeam')
  //   .addClass(`${codenameCurrentTeam}Team`);

  if (myCodenameTeam == codenameCurrentTeam) {
    if (data.switchTeam) {
      waitingSpyMaster = true;

      if (isSpyMaster) {
        $('#clue-display').hide();
        $('#clue-input-container').show();
      } else {
        $('#clue-input-container').hide();
        $('#clue-display').show().html(`<span class="text-success">Waiting for ${playerInfoList[spyMasters[myCodenameTeam]].name}</span>`);
      }
    }
  } else {
    $('#clue-input-container').hide();
    $('#clue-display').show().html(`<span>It's their turn</span>`);
  }
  if (myCodenameTeam == codenameCurrentTeam && data.switchTeam) {
    waitingSpyMaster = true;
  }
}

function codenameEndGame() {
  $('#btn-exit-game').prop('disabled', false);
  $('.camera-container').removeClass('redTeam blueTeam').css({
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

function submitClue(data) {
  if (myCodenameTeam == codenameCurrentTeam) {
    waitingSpyMaster = false;
    $('#clue-input-container').hide();
    $('#clue-display').show().html(`<div class="d-flex justify-content-between w-100"><span class="${myCodenameTeam == 'red' ? 'text-danger' : 'text-primary'}">${data.clue}</span><span class="${myCodenameTeam == 'red' ? 'text-danger' : 'text-primary'}">${data.count} cards</span></div>`);
  }
}

$('#wordsTable .codename-card').click(function () {
  if (codenameState == 'end' || myCodenameTeam != codenameCurrentTeam || isSpyMaster || waitingSpyMaster) {
    return;
  }
  sendMessage({
    type: 'codename-flip',
    data: $(this).data('pos')
  });
});

$('#submit-clue').click(function () {
  sendMessage({
    type: 'submit-clue',
    data: {
      clue: $('#clue-input').val(),
      count: $('#clue-count-input').val()
    }
  });
  $('#clue-input').val('');
  $('#clue-count-input').val('');
});