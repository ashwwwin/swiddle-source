var richupGameId = '';
window.onbeforeunload = null;
$('#richup-game-scene').hide().css('opacity', 1);

function initRichUpGame() {
    sendMessage({
        type: 'get-richup'
    });
}

function setupRichUp (data) {
    richupGameId = data;
    startRichUp();
}

function startRichUp() {
    //Camera setup
    if (acceptedCount < 7) {
      cameraScale = $('body').width() / 10 / cameraContainerWidth;
    } else {
      cameraScale = $('body').width() / 15 / cameraContainerWidth;
    }
    $('.camera-item').appendTo('#cameras-container');
    $('.camera-item').filter(function () {
      return gamePlayerIds.includes($(this).attr('id'));
    }).each(function () {
      $(this).appendTo('#richup-cameras-container');
    });
  
    $('#richup-cameras-container .camera-container').css({
      width: cameraContainerWidth * cameraScale,
      height: cameraContainerWidth * cameraScale,
    }).find('video').css({
      width: cameraWidth * cameraScale,
      height: cameraHeight * cameraScale
    });
  
    // Don't repeat init once init lipoker game
    // It'll be joining the game
    if ($('#richup-game-scene').is(':hidden')) {
      var richupUsername;
  
    //   //LiPoker table creation config
    //   if (sceneName == 'home') {
    //     //If user is playing at home then they join the same table every time
    //     lipokerGameId = "homes" + (homeOwner._id).substring(0, 11);
    //   } else {
    //     //User playing outside, new table every time by gameRoomId
    //     var sceneNameLength = 16 - sceneName.length;
    //     lipokerGameId = sceneName + gameRoomId.substring(0, sceneNameLength);
    //     lipokerGameId = lipokerGameId.replace('-', '1');
    //   }
  
      //Checking if user is a guest & getting username
      if (userInfo.name == null) {
        richupUsername = personData.name;
      } else {
        richupUsername = userInfo.name;
      }
      
  
      //Missing check for duplicate username is required on the backend: is there another user with a different user id but has the same name playing?
      iframeURL = 'https://richup.io/' + richupGameId + '?username=' + richupUsername + '&referrer=onlyfriends.io';

  
      $('#richup-iframe').attr('src', iframeURL);
      $('#richup-game-scene').show();
    }
  }
  
  var richupEndGame = function () {
    // Close lipoker game
    $('#richup-iframe').attr('src', 'about:blank');
  
    $('.camera-container').css({
      width: cameraContainerWidth,
      height: cameraContainerWidth
    }).find('video').css({
      width: cameraWidth,
      height: cameraHeight
    });
    $('.camera-item').appendTo('#cameras-container');
    $('#cameras-container').show();
    $('#richup-game-scene').hide();
    $('#continue-game-panel').removeClass('d-flex');
  }