var notifyLocationTimer;
console.log('Socket.js start', userInfo);
// Emoji text
var emojiTexts = {
  "o\\.o": "👀",
  ":D": "😀",
  ">\\.<": "😆",
  ":\\)": "🙂",
  ";\\)": "😉",
  ":P": "🤪",
  "xD": "😆",
  "<3": "💙",
  ":\\'\\(": "😭",
  ":X": "🤐",
  ":\\|": "😐",
  ":\\(": "🙁",
  "8\\)": "😎",
  ":J": "😏",
  "O:\\)": "😇",
  "<3\\)": "😍",
};

// Variable to check if scene is rendered or not - it's used in 'player-list' socket
var renderedScene = true;

// When move to another scene, disable all actions
var disableAction = false;

// When user hits a dead end page on the desktop app, then what?
// Example of a dead end would be when they get ejected
// This solves that problem
function redirectDesktopDeadend() {
  if (desktopApp == true) {
    if (!personData.guest && userInfo.address) {
      window.location.pathname = `/${userInfo.address}`;
    } else {
      window.location.pathname = '/sign-in';
    }
  }
}


enterHomeAction = function () {
  startLoading();

  var password = generateRandomString(passwordLength);
  $('#owner-address').val(siteUrl + '/' + roomId);
  $('#owner-password').val(password);

  sendMessage({
    type: 'enter-home',
    data: {
      playerInfo: personData,
      password: password
    }
  });

  $('#coins').text(sessionStorage.getItem('coins'));
  
  function initializeStuff() {
    if (!userInfo) {
      //If userInfo has not loaded yet then check again after 1 second
      setTimeout(function() {
        initializeStuff();
      }, 1000);
      return;
    } else {
      //Checks daily reward status
      checkDailyReward();

      //Gets friend suggestions
      loadFriendSuggestions();

      //Gets items in the $ shop
      getShop();

      //Loads events
      loadMyEvents();
    }
  }

  //when page has loaded
  $(document).ready(function () {
    //Initialize rewards, friend suggestions, etc.
    initializeStuff();
  });
}

visitHomeAction = function () {
  startLoading();

  $('#coins').text(sessionStorage.getItem('coins'));
}

setupSocket = function () {
  socket.on('connect', function () {

    if (encodeURIComponent(sessionStorage.getItem('address')).toLowerCase() == roomId) {
      enterHomeAction();
      $('#volume-icon').remove();
    } else {
      $('.header').hide();
      $('#knock-screen').show();
      sendMessage({
        type: 'visit-home',
        data: roomId
      });
      $('#eject-player').remove();
      $('#invite-player').remove();
      $('#allow-guest-play').parent().remove();
      // if (sessionStorage.getItem('loggedIn')) {
        visitHomeAction();
      // }
    }
  });

  socket.on('disconnect', function () {
    $.notify('Connection error, retrying...', {
      type: 'danger',
    });
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  });

  socket.on('sign-out', function () {
    logout();
  });

  // Stores the user's data
  socket.on('my-info', function (data) {
    console.log('my-info', data);
    userInfo = data;

    updateCoins();

    stopLoading();
  });

  // Receive knock
  socket.on('knock-on', function (player) {
    ring.play();
    var $knockContainer = $('.knock-notify-container-clone').clone()
      .removeClass('knock-notify-container-clone')
      .addClass('knock-notify-container');
    $knockContainer.data('id', player.id)
      .attr('id', 'knock-' + player.id)
      .find('.player-name')
      .text(player.name);
    $('#knock-group-container').prepend($knockContainer);
    if (desktopApp) {
      new Notification(`🚪 ${player.name} is at your door. Let them know you're home!`);
    }
  });

  // Ignore your knock
  socket.on('ignore-knock', function () {
    redirectDesktopDeadend();

    $('#knock-container')
      .add('#password-input')
      .add('#welcome-avatar')
      .add('#welcome-msg')
      .hide();
    $('#container').add('#navbar')
      .add('#right-nav')
      .addClass('d-none');
    $('#message-box-container').removeClass('d-flex').addClass('d-none');
    $('#knock-screen').show();
    $('#empty-home').addClass('d-flex').removeClass('d-none');
    $('#container').hide();
  });

  // Ejected by home owner
  socket.on('eject-player', function () {
    redirectDesktopDeadend();

    $('#knock-container')
      .add('#password-input')
      .add('#welcome-avatar')
      .add('#welcome-msg')
      .hide();
    $('.header').hide();
    $('#message-box-container').removeClass('d-flex').addClass('d-none');
    $('#knock-screen').show();
    $('#empty-home').addClass('d-flex').removeClass('d-none');
    $('#container').hide();

  });

  // Owner isn't home
  socket.on('empty-home', function () {
    redirectDesktopDeadend();

    $('#knock-container')
      .add('#password-input')
      .add('#welcome-avatar')
      .add('#welcome-msg')
      .hide();
    $('#container').add('#navbar')
      .add('#right-nav')
      .addClass('d-none');
    $('#message-box-container').removeClass('d-flex').addClass('d-none');
    $('#knock-screen').show();
    $('#empty-home').addClass('d-flex').removeClass('d-none');
  });

  // Require password for knock
  socket.on('enter-password', function () {
    $('#knock-container')
      .add('#welcome-avatar')
      .add('#welcome-msg')
      .hide();
    $('#bunny-avatar').show();
    $('#password-container').addClass('d-flex').removeClass('d-none');
    $('#password-input').focus();
  });

  socket.on('correct-password', function () {
    // spiner.stop();
    $('#bunny-avatar').hide();
    $('#password-container').addClass('d-none').removeClass('d-flex');
    $('#knock-container')
      .add('#welcome-avatar')
      .add('#welcome-msg')
      .show();
    // if (sessionStorage.getItem('loggedIn')) {
      visitHomeAction();
    // }
  });

  // Re-enter password
  socket.on('wrong-password', function () {
    // spiner.stop();
    $.notify('The password is incorrect.', {
      type: 'danger',
    });
    $('#password-input').focus();
  });

  // Change password for knock
  socket.on('change-password', function (psw) {
    $('#owner-password').val(psw);
  });

  // Set requiring password for knock
  socket.on('require-password', function (flag) {
    $('#require-password').val(flag);
  });

  socket.on('wrong-address', function () {
    if (userInfo.address) {
      window.location.pathname = '/' + userInfo.address;
    } else {
      window.location.pathname = '/sign-in';
    }
  });

  // Get available player list and store it
  socket.on('player-list', function (data) {
    console.log(data);
    // spiner.stop();
    // changeLoadingValue(50);
    // Can't rerender scene while rendering scene
    if (!data.force && sceneName == data.scene || !renderedScene) {
      return;
    }
    disconnectAllVideoRoom();
    if (data.force) {
      isHomeOwner = false;
    }
    sceneName = data.scene;
    renderedScene = false;
    enterHome = true;
    roomId = data.roomId;

    removeAllPlayers();

    for (inventoryId in inventoryObjects) {
      inventoryObjects[inventoryId].destroy();
      delete inventoryObjects[inventoryId];
    }

    inventories = data.inventories || {};

    // Initialize seat's positions
    seatTable.removeAll(true);
    if (data.scene == 'home') {
      data.seats = generateSeats();
      window.history.pushState({}, '', roomId);
    } else {
      //window.history.pushState({}, '', sceneName);
    }
    if (data.seats) {
      for (const seatTableId in data.seats) {
        const seatTableData = data.seats[seatTableId];
        const seatWidth = seatTableData.seatWidth * scale;
        const chairHeight = seatTableData.chairHeight * scale;
        const deskHeight = seatTableData.deskHeight * scale;
        for (i = 0; i < seatTableData.count; i++) {
          const num = i;
          const posX = (seatTableData.firstPosX + seatTableData.seatWidth * num) * scale;
          const posY = seatTableData.firstPosY * scale;
          const area = scene.add.rectangle(posX, posY - chairHeight, seatWidth, chairHeight + deskHeight);
          area.setOrigin(0.5, 0).setInteractive({
            useHandCursor: true
          });
          area.on('pointerdown', function (pointer, _x, _y, event) {
            // Check if a modal is opened
            if ($(pointer.downElement).parent().attr('id') != 'container') {
              return;
            }
            event.stopPropagation();
            // Check if click left button
            if (pointer.button != 0) {
              //If right click
              $('#show-sit-down').siblings('.popup-menu').css({
                'top': pointer.event.y,
                'left': pointer.event.x
              });
              $('#show-sit-down').dropdown('show');
              $('#sit-down').data('tableId', seatTableId);
              $('#sit-down').data('pos', num);
            } else {
              //If left click
              sitDown(seatTableId, num);
            }
          });
          seatTable.add(area);
          if (!seatList[seatTableId]) {
            seatList[seatTableId] = [];
          }
          seatList[seatTableId].push({
            posX: posX,
            posY: posY,
            empty: true
          });
        }
      }
    }

    $('.header').show();
    $('#message-box-container').removeClass('d-none').addClass('d-flex');
    $("#choose-game-container").removeClass('d-flex').addClass('d-none');
    $('#container').add('#navbar').add('#right-nav').removeClass('d-none');
    $('#knock-screen').hide();
    $('#coins-container').show();

    // Fade out notify location
    clearTimeout(notifyLocationTimer);
    notifyLocationTimer = setTimeout(function () {
      $('#notify-location').fadeOut();
    }, 3000);

    // Change scene
    $('#inventory-box').hide();
    $('#show-designer-container').addClass('d-none').removeClass('d-flex');
    trashBox?.setVisible(false);
    furnitureShopButton?.setVisible(false);
    if (data.scene == 'home') {
      plazaToHomeDoor.setVisible(false);
      plazaToShopDoor.setVisible(false);
      plazaToPizzaDoor.setVisible(false);
      shopToPlazaDoor.setVisible(false);
      pizzaToPlazaDoor.setVisible(false);

      //Checks if the user is the homeOwner & if they have completed the guide
      if (isHomeOwner) {
        if (userInfo.guideState != 'finish') {
          //Open the welcome guide if they have't completed it
          welcomeGuide();
        }
      } 

      //Decides the room name
      if (homeOwner.roomName) {
        $('#notify-location').text(homeOwner.roomName).fadeIn();
      } else {
        if (isHomeOwner) {
          $('#notify-location').text('Welcome home').fadeIn();
        } else {
          $('#notify-location').text(homeOwner.name + "'s home").fadeIn();
        }
      }

      generateInventories();

      // setGrid();
    } else if (data.scene == 'plaza') {
      plazaToHomeDoor.setVisible(true);
      plazaToShopDoor.setVisible(true);
      plazaToPizzaDoor.setVisible(true);

      shopToPlazaDoor.setVisible(false);
      pizzaToPlazaDoor.setVisible(false);

      $('#notify-location').text('The Plaza').fadeIn();
    } else if (data.scene == 'shop') {
      shopToPlazaDoor.setVisible(true);

      plazaToHomeDoor.setVisible(false);
      plazaToShopDoor.setVisible(false);
      plazaToPizzaDoor.setVisible(false);
      pizzaToPlazaDoor.setVisible(false);

      $('#notify-location').text('Coffee Co.').fadeIn();
    } else if (data.scene == 'pizza') {
      pizzaToPlazaDoor.setVisible(true);

      plazaToPizzaDoor.setVisible(false);
      plazaToHomeDoor.setVisible(false);
      plazaToShopDoor.setVisible(false);
      shopToPlazaDoor.setVisible(false);

      $('#notify-location').text('Pizzeria').fadeIn();
    } else if (data.scene == 'home-design') {
      plazaToHomeDoor.setVisible(false);
      plazaToShopDoor.setVisible(false);
      plazaToPizzaDoor.setVisible(false);
      shopToPlazaDoor.setVisible(false);
      pizzaToPlazaDoor.setVisible(false);
      roomSetting.setVisible(false);
      trashBox?.setVisible(true);
      furnitureShopButton?.setVisible(true);

      $('#inventory-box').show();

      ownFurnitureList = data.furnitureList;

      initInventoryScene();
      pioneerAnalytics.active();

      $('#message-box-container').removeClass('d-flex').addClass('d-none');
      $('#show-designer-container').removeClass('d-none').addClass('d-flex');
      $('#notify-location').text('Home Designer').fadeIn();
    }

    scene.changeScene();

    for (playerId in speechEvents) {
      if (speechEvents[playerId] && playerId != ownId) {
        speechEvents[playerId].stop();
      }
    }
    for (playerId in data.playerList) {
      const player = data.playerList[playerId];
      player.posX *= scale;
      player.posY *= scale;
      console.log(player.seatTableId, player.seatPos)
      if (player.seatTableId && player.seatPos) {
        try {
          seatList[player.seatTableId][player.seatPos].empty = false;
          seatStates[playerId] = {
            tableId: player.seatTableId,
            pos: player.seatPos
          };
        } catch (error) {
          console.log(error);

        }
      }
      playerInfoList[playerId] = player;
      scene.createContainer(player);
      if (targetPoints[playerId]) {
        targetPoints[playerId].setPosition(player.posX, player.posY);
      } else {
        targetPoints[playerId] = new Phaser.Geom.Circle(player.posX, player.posY, targetRadian);
      }
      if (videoEllipses[playerId]) {
        videoEllipses[playerId].setPosition(player.posX, player.posY);
      } else {
        videoEllipses[playerId] = new Phaser.Geom.Ellipse(player.posX, player.posY, cmtEllipseWidth, cmtEllipseHeight);
      }
      if ($('#' + player.id).length) continue;
      var $cameraItem = $('.camera-clone-item').clone().removeClass('camera-clone-item').addClass(['camera-item', 'order-' + player.seatPos]).attr('id', player.id);
      if (player.avatar) {
        $cameraItem.find('img').attr('src', player.avatar);
      }
      if (player.id === ownId) {
        $cameraItem.find('audio').prop('muted', true);
        $cameraItem.children('.peer-name').text('You');
      } else {
        $cameraItem.children('.peer-name').text(player.name);
      }
      $cameraItem.prependTo('#cameras-container');
    }

    scene.cameras.main.startFollow(containerList[ownId]);
    goToEvents.setVisible(false);
    goToDesign.setVisible(false);
    // roomSetting.setVisible(false);
    if (sceneName == 'home') {
      $('#switch-video').show();
      $('#invite-player').hide();
      isHomeOwner = (homeOwner._id == ownId);
      if (isHomeOwner) {
        $('#invite-icon').show();
        $('#eject-player').show();

        $('#play-pause-video-setting').show();
        goToEvents.setVisible(true);
        goToDesign.setVisible(true);
        roomSetting.setVisible(true);
        if (data.guestCanPlayVideo) {
          $('#allow-guest-play').prop('checked', true);
        }
      } else {
        if (data.guestCanPlayVideo) {
          $('#video-control-container').show().parents('.modal-dialog').css({
            width: 970,
            maxWidth: 970,
          });
        } else {
          $('#video-control-container').hide().parents('.modal-dialog').css({
            width: 690,
            maxWidth: 690,
          });
        }
      }
      $('#fullscreen-video-button').show();

      // Open camera
      openMyVideo();

      // if (enableAudio) {
      openMyAudio();
      // }
    } else {
      $('#invite-player').show();
      $('#invite-icon').hide();
      $('#fullscreen-video-button').hide();
      disableMyVideo();

      openMyAudio();

      $('#eject-player').hide();

      // $('#choose-game-list .choose-game-item[data-game=who-is]').hide();
      if (gameType == 'who-is') {
        $('#choose-game-list .choose-game-item[data-game=doodly]').click();
      }
      $('#play-pause-video-setting').hide();
      $('#volume-icon').hide();
    }
    renderedScene = true;

    disableAction = false;

    // changeLoadingValue(100);
    setTimeout(() => {
      stopLoading();
    }, 1000);
  });

  // Add a player to containerList
  socket.on('add-player', function (playerInfo) {
    playerInfo.posX *= scale;
    playerInfo.posY *= scale;
    scene.createContainer(playerInfo);
    if (targetPoints[playerInfo.id]) {
      targetPoints[playerInfo.id].setPosition(playerInfo.posX, playerInfo.posY);
    } else {
      targetPoints[playerInfo.id] = new Phaser.Geom.Circle(playerInfo.posX, playerInfo.posY, targetRadian);
    }
    if (videoEllipses[playerInfo.id]) {
      videoEllipses[playerInfo.id].setPosition(playerInfo.posX, playerInfo.posY);
    } else {
      videoEllipses[playerInfo.id] = new Phaser.Geom.Ellipse(playerInfo.posX, playerInfo.posY, cmtEllipseWidth, cmtEllipseHeight);
    }

    if (!$('#' + playerInfo.id).length) {
      var $cameraItem = $('.camera-clone-item').clone().removeClass('camera-clone-item').addClass('camera-item').attr('id', playerInfo.id);
      $cameraItem.children('.peer-name').text(playerInfo.name);
      $cameraItem.prependTo('#cameras-container');
      if (playerInfo.avatar) {
        $cameraItem.find('img').attr('src', playerInfo.avatar);
      }
    }
    playerInfoList[playerInfo.id] = playerInfo;
  });

  socket.on('remove-player', function (playerId) {
    // Remove player
    formatRemovedPlayer(playerId);
  });

  // update message per sender's ID
  socket.on('update-message', function (data) {
    if (data.msg.length >= 1) {
      msg = replaceEmoji(data.msg);
      scene.createSpeechBubble(data.id, bubbleSpeechWidth, msg);
    }
  });

  socket.on('banned-message', function (data) {
    scene.createSpeechBubble(data.id, bubbleSpeechWidth, '🚫');
  });

  socket.on('game-msg', function (data) {
    addGameChat(data.id, data.msg);
  });

  socket.on('banned-game-msg', function (data) {
    addGameChat(data.id, '🚫');
  });

  // update position per sender's ID
  socket.on('update-position', function (data) {
    // Can't move while rendering scene
    if (!renderedScene) {
      return;
    }
    if (data?.goHomeToPlaza && sceneName != 'home' ||
      data?.goCoffeeShopToPlaza && sceneName != 'shop' ||
      data?.goPlazaToPizza && sceneName != 'plaza' ||
      data?.goPizzaToPlaza && sceneName != 'pizza'
    ) {
      return;
    }
    if (!containerList[data.id]) {
      return;
    }
    data.posX *= scale;
    data.posY *= scale;
    if (targetPoints[data.id]) {
      targetPoints[data.id].setPosition(data.posX, data.posY);
    } else {
      targetPoints[data.id] = new Phaser.Geom.Circle(data.posX, data.posY, targetRadian);
    }
    // Reset video connections
    var hadSeat = seatStates[data.id];
    if (hadSeat) {
      seatList[hadSeat.tableId][hadSeat.pos].empty = true;
      var avatar = containerList[data.id].getAt(0);
      avatar.setCrop(0, 0, avatar.width, avatar.height);
      delete seatStates[data.id];
      if (data.id === ownId) {
        disconnectVideoRoom(`-table-${hadSeat.tableId}`);
        // if (sceneName == 'home') {
        $('#choose-game-container').removeClass('d-flex').addClass('d-none');
        // }
        $('#message-box-container').removeClass('d-none').addClass('d-flex');

        $('#waiting-game-msg').hide();
        clearInterval(timer);
      }
    }
    // stop before tween
    if (tweens[data.id]) {
      tweens[data.id].remove();
    }
    // move to point
    moveSteps[data.id] = 0;
    var distance = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, data.posX, data.posY));
    tweens[data.id] = scene.tweens.add({
      targets: containerList[data.id],
      x: data.posX,
      y: data.posY,
      depth: data.posY,
      step: {
        from: 0,
        to: distance / moveSpeed / 200
      },
      duration: distance / moveSpeed,
      onUpdate: function (tween) {
        // ISSUE-32723 Remove this comment when sticky objects are resolved.
        // if (sceneName == 'home' && checkFurnitureCollision(data.id, !hadSeat)) {
        //   tween.remove();
        //   return;
        // }
        const currentStep = Math.floor(tween.data[3].current);
        if (moveSteps[data.id] < currentStep) {
          moveSteps[data.id] = currentStep;

          if (videoEllipses[data.id]) {
            videoEllipses[data.id].setPosition(tween.data[0].current, tween.data[1].current);
          } else {
            videoEllipses[data.id] = new Phaser.Geom.Ellipse(tween.data[0].current, tween.data[1].current, movingCmtEllipseWidth, movingCmtEllipseHeight);
          }

          if (data.id === ownId) {
            for (playerId in videoEllipses) {
              if (playerId === ownId) continue;

              var roomName = playerId + '/' + ownId;
              if (ownId > playerId) {
                roomName = ownId + '/' + playerId;
              }
              // if (sceneName == 'home') {
              if (!seatStates[playerId] && videoEllipses[ownId].contains(containerList[playerId].x, containerList[playerId].y)) {
                connectVideoRoom(roomName);
                var dist = parseInt(Phaser.Math.Distance.Between(containerList[playerId].x, containerList[playerId].y, containerList[ownId].x, containerList[ownId].y));
                setVolume(playerId, dist, movingCmtEllipseWidth / 2);
              } else {
                disconnectVideoRoom(roomName);
              }
              // }
            }
          } else if (videoEllipses[data.id].contains(containerList[ownId].x, containerList[ownId].y)) {
            var dist = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, containerList[ownId].x, containerList[ownId].y));
            setVolume(data.id, dist, movingCmtEllipseWidth / 2);
          }
        }
      },
      onComplete: function () {
        targetPoints[data.id].setPosition(data.posX, data.posY);
        videoEllipses[data.id].setPosition(data.posX, data.posY);
        if (data.id === ownId) {
          for (playerId in videoEllipses) {
            if (playerId === ownId) {
              sendMessage({
                type: 'updated-position',
                data: {
                  posX: data.posX / scale,
                  posY: data.posY / scale,
                }
              });
              continue;
            }

            var roomName = playerId + '/' + ownId;
            if (ownId > playerId) {
              roomName = ownId + '/' + playerId;
            }
            // if (sceneName == 'home') {
            if (!seatStates[playerId] && videoEllipses[ownId].contains(containerList[playerId].x, containerList[playerId].y)) {
              connectVideoRoom(roomName);
              var dist = parseInt(Phaser.Math.Distance.Between(containerList[playerId].x, containerList[playerId].y, containerList[ownId].x, containerList[ownId].y));
              setVolume(playerId, dist, movingCmtEllipseWidth / 2);
            } else {
              disconnectVideoRoom(roomName);
            }
            // }
          }

          if (sceneName === 'home' && data.goHomeToPlaza) {
            sendMessage({
              type: 'home-to-plaza'
            });
            //Pauses youtube when user leaves
            startLoading();
          } else if (sceneName === 'plaza' && data.goPlazaToHome) {
            sendMessage({
              type: 'plaza-to-home'
            });
            startLoading();
          } else if (sceneName === 'plaza' && data.goPlazaToCoffeeShop) {
            sendMessage({
              type: 'plaza-to-shop'
            });
            startLoading();
          } else if (sceneName === 'shop' && data.goCoffeeShopToPlaza) {
            sendMessage({
              type: 'shop-to-plaza'
            });
            startLoading();
          } else if (sceneName === 'plaza' && data.goPlazaToPizza) {
            sendMessage({
              type: 'plaza-to-pizza'
            });
            startLoading();
          } else if (sceneName === 'pizza' && data.goPizzaToPlaza) {
            sendMessage({
              type: 'pizza-to-plaza'
            });
            startLoading();
          } else if (data.whackAMole) {
            $('#whack-a-mole-game-modal').modal('show');
          }
        } else {
          var roomName = data.id + '/' + ownId;
          if (ownId > data.id) {
            roomName = ownId + '/' + data.id;
          }
          // if (sceneName == 'home') {
          if (videoEllipses[data.id].contains(containerList[ownId].x, containerList[ownId].y)) {
            connectVideoRoom(roomName);
            var dist = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, containerList[ownId].x, containerList[ownId].y));
            setVolume(data.id, dist, movingCmtEllipseWidth / 2);
          } else {
            disconnectVideoRoom(roomName);
          }
          // }
        }
      }
    });
  });

  // Change a peer's speaking status
  socket.on('speaking', function (data) {
    containerList[data.playerId]?.getAt(1)?.setVisible(data.status);
  });

  // Move to a seat
  socket.on('sit-down', function (data) {
    if (!containerList[data.id]) {
      return;
    }
    if (data.id == ownId) {
      playerSeatTableId = data.tableId;
      playerSeatPos = data.pos;
    }
    var seat = seatList[data.tableId][data.pos];
    var hadSeat = seatStates[data.id];
    if (hadSeat) {
      seatList[hadSeat.tableId][hadSeat.pos].empty = true;

      if (hadSeat.tableId != data.tableId) {
        var avatar = containerList[data.id].getAt(0);
        avatar.setCrop(0, 0, avatar.width, avatar.height);

        if (data.id == ownId) {
          $('#message-box-container').removeClass('d-none').addClass('d-flex');
          $('#waiting-game-msg').hide();
          clearInterval(timer);
        }

        seatStates[data.id] = {
          tableId: data.tableId,
          pos: data.pos
        };

        disconnectAllVideoRoom();

        if (sitPlayerCount(data.tableId) == 2 && seatStates[ownId]?.tableId == data.tableId ||
          sitPlayerCount(data.tableId) > 2 && data.id == ownId) {
          connectVideoRoom(`-table-${data.tableId}`);
        }
      }

      seatStates[data.id] = {
        tableId: data.tableId,
        pos: data.pos
      };
    } else {
      seatStates[data.id] = {
        tableId: data.tableId,
        pos: data.pos
      };

      disconnectAllVideoRoom();

      if (sitPlayerCount(data.tableId) == 2 && seatStates[ownId]?.tableId == data.tableId ||
        sitPlayerCount(data.tableId) > 2 && data.id == ownId) {
        connectVideoRoom(`-table-${data.tableId}`);
      }
    }
    seatList[data.tableId][data.pos].empty = false;

    $(`#${data.id}`).removeClass(function (_index, className) {
      return (className.match(/\border-\S+/g) || []).join(' ')
    }).addClass('order-' + data.pos);

    var distance = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, seat.posX, seat.posY));
    if (tweens[data.id]) {
      tweens[data.id].remove();
    }
    tweens[data.id] = scene.tweens.add({
      targets: containerList[data.id],
      x: seat.posX,
      y: seat.posY,
      depth: seat.posY,
      duration: distance / moveSpeed,
      onUpdate: function (tween) {
        if (sceneName == 'home' && checkFurnitureCollision(data.id)) {
          tween.remove();
          return;
        }
      },
      onComplete: function () {
        var avatar = containerList[data.id].getAt(0);
        avatar.setCrop(0, 0, avatar.width, avatar.height / 2);

        if (data.id === ownId) {
          $('#message-box-container').removeClass('d-flex').addClass('d-none');
          // if (sceneName == 'home') {
          $('#choose-game-container').removeClass('d-none').addClass('d-flex');
          // }
        }
      }
    });
  });

  // Play game sockets
  socket.on('offer-game', function (data) {
    if (data.tableId != playerSeatTableId) {
      return;
    }
    $('#play-game-modal').modal();
    $('#play-game-modal .choose-game-item-image').removeClass().addClass(['choose-game-item-image', data.gameType + '-logo']);

    $('#play-game-modal').data('gameRoomId', data.gameRoomId);
    $('#play-game-modal').find('.player-name').text(playerInfoList[data.creatorId]?.name);
    $('#play-game-modal').find('.game-title').text(" " + gameList[data.gameType].title);
    $('#play-game-modal').find('.game-description').html(gameList[data.gameType].desc);
    pioneerAnalytics.active();
  });

  socket.on('cancel-game', function (data) {
    // spiner.stop();
    $.notify(`You need ${3 - data} more player${(3 - data) >= 2?'s' : ''}`, {
      type: 'danger',
    });
    endGame();
    $('#waiting-game-msg').text('Waiting for players...').show();
    $('#choose-game-container').removeClass('d-flex').addClass('d-none');
  });

  socket.on('cancel-counting', function (data) {
    // spiner.stop();
    $.notify(`You need ${3 - data} more player${(3 - data) >= 2?'s' : ''}`, {
      type: 'danger',
    });
    $('#waiting-game-msg').text('Waiting for players...').show();
    clearInterval(timer);
  });

  socket.on('warning-message', function (data) {
    $.notify(data, {
      type: 'danger',
    });
    endGame();
  });

  socket.on('start-game', function (data) {
    startGame(data);
    pioneerAnalytics.active();
  });

  // socket.on('choose-game', function () {
  //   $('.camera-item').filter(function () {
  //     return seatStates[$(this).attr('id')] && seatStates[$(this).attr('id')].tableId == playerSeatTableId;
  //   }).appendTo('#choose-game-cameras-container');
  //   $('#choose-game-panel').show();
  //   gamePlayerState = 'choose-game';
  // });

  socket.on('waiting-next-game', function () {
    gameRoomId = '';
    $('#waiting-game-msg').text('Waiting for next game').show();
    $("#choose-game-container").removeClass('d-flex').addClass('d-none');
  });

  socket.on('counting-game', function (data) {
    gameRoomId = data.gameRoomId;
    waitingGameTimer = data.count;
    $('#waiting-game-msg').text(`Starting in ${waitingGameTimer}s`).show();
    $("#choose-game-container").removeClass('d-flex').addClass('d-none');
    timer = setInterval(() => {
      waitingGameTimer--;
      if (waitingGameTimer >= 0) {
        $('#waiting-game-msg').text(`Starting in ${waitingGameTimer}s`);
      } else {
        clearInterval(timer);
      }
    }, 1000);
  });

  socket.on('waiting-players', function (data) {
    gameRoomId = data;
    $('#waiting-game-msg').text('Waiting for players...').show();
    $("#choose-game-container").removeClass('d-flex').addClass('d-none');
  });

  // Sockets for invitation
  socket.on('invite-player', function (data) {
    var playerInfo = playerInfoList[data.playerId];
    if (playerInfo) {
      var $invitationContainer = $('.invitation-container-clone').clone()
        .removeClass('invitation-container-clone')
        .addClass('invitation-container');
      $invitationContainer.data('id', playerInfo.id)
        .data('address', data.address)
        .attr('id', 'invitation-' + playerInfo.id)
        .find('.player-name')
        .text(playerInfo.name);
      $('#knock-group-container').prepend($invitationContainer);

      if (desktopApp) {
        new Notification(`🏠 ${data.name} invited you home. Don't keep them waiting!`);
      }
    }
    pioneerAnalytics.active();
  });

  socket.on('ignore-invitation', function (playerName) {
    //$.notify(playerName + ' ignored your invitation', {
    //  type: 'danger'
    //});
  });

  socket.on('accept-invitation', function (playerName) {
    pioneerAnalytics.active();
    //$.notify(playerName + ' accepted your invitation', {
    //  type: 'success'
    //});
  });

  // Sockets for friend system
  socket.on('add-friend', function (data) {
    receiveFriendRequest(data);
    pioneerAnalytics.active();
  });

  socket.on('accept-friend', function (data) {
    acceptedFriend(data);
    pioneerAnalytics.active();
  });

  socket.on('ignore-friend', function (data) {
    ignoredFriend(data);
  });

  socket.on('friend-list', function (data) {
    initFriendList(data);
  });

  socket.on('check-chat-history', function (row) {
    openConvo(row);
  });

  socket.on('added-friend', function (data) {
    addedFriend(data.friend, data.status);
  });

  socket.on('remove-friend', function (data) {
    removeFriend(data);
    sendMessage({
      type: 'friend-msg-viewed',
      data: data
    });

    badgeUpdate();
  });

  socket.on('ring-friend', function (player) {
    ringFriend(player);
  });

  socket.on('ignore-ring-friend', function (playerName) {
    // $.notify(playerName + ' doesn\'t accept your knock', {
    //   type: 'danger'
    // });
  });

  socket.on('friend-status', function (data) {
    updateFriendStatus(data);
  });

  socket.on('invite-friend', function (data) {
    inviteFriend(data);
  });

  socket.on('wrong-friend-name', function () {
    $.notify('User not found', {
      type: 'danger'
    });
  });

  socket.on('exist-friend', function (address) {
    $.notify(`Friend request is pending`);
  });

  socket.on('success-add-friend', function (address) {
    $.notify(`Friend request sent!`);
  });

  socket.on('friend-msg', function (data) {
    friendMsg(data);
  });

  socket.on('desktop-badge-update', function (data) {
    var unreadMsgsNum = data.unreadMsgs;

    if (unreadMsgsNum > 0) {
      //Updates desktop badge
      if (desktopApp) {
        //Checks if mac since app badges only exist on mac
        if (navigator.platform == 'MacIntel') {
          var strUnreadMsgsNum = unreadMsgsNum.toString();
          window.todesktop.app.dock.setBadge(strUnreadMsgsNum);
        }
      }
      $('#circle-notify-friend').removeClass('d-none');
    } else {
      $('#circle-notify-friend').addClass('d-none');
    }
    //Use else for in game badges
    // else {
    //   console.log(unreadMsgsNum + " unread messages");
    // }

  });

  socket.on('friend-chat-history', function (data) {
    chatHistory(data);
  });

  socket.on('update-bitmoji', function (data) {
    mixpanel.track('Bitmoji Update', {
      'ownId': ownId
    });

    pioneerAnalytics.active();
    var player = playerInfoList[data.id];
    player.name = data.name;
    player.avatar = data.avatar;
    if (player.avatar) {
      scene.load.image(data.id, data.avatar, true);
      scene.load.start();
    }
    if (data.id == ownId) {
      //Updates the user info
      userInfo.avatar = data.avatar;
      personData.avatar = data.avatar;
      personData.name = data.name;

      //Updates the avatar in user-settings
      $('#user-settings-avatar-image').attr('src', data.avatar);
      $('#user-settings-profile-circle-photo').css({'background-image': `url(${data.avatar})`});
    } else {
      $('#' + player.id).find('.peer-name').text(player.name);
    }
  });

  // Sockets related to game
  socket.on('leave-game-player', function (data) {
    leaveGamePlayer(data);
  });

  socket.on('join-game-player', function (playerId) {
    joinGamePlayer(playerId);
  });

  socket.on('join-game', function (data) {
    // It's not used
    joinGame(data);
  });

  socket.on('wait-next-game', function () {
    $.notify('Wating for next game', {
      type: 'success'
    });
  });

  socket.on('set-playerId', function (playerId) {
    ownId = personData.id = playerId;
    console.log(playerId);
  });

  socket.on('twilio-token', function (token) {
    twilioToken = token;
  });

  // Who Is game sockets
  socket.on('who-is-vote', function (msg) {
    whoIsVotePerson(msg)
  });

  socket.on('who-is-new-round', function (data) {
    whoIsStartNewRound(data.round);
  });

  // Doodly game sockets
  socket.on('sketch-width', function (data) {
    setPlayerSketchWidth(data);
  });

  socket.on('drawing', function (msg) {
    doodlyDrawing(msg);
  });

  socket.on('finish-drawing', function () {
    doodlyFinishDrawing();
  });

  socket.on('change-color', function (msg) {
    doodlyChangeColor(msg.color);
  });

  socket.on('change-tool', function (msg) {
    doodlyChangeTool(msg.tool);
  });

  socket.on('select-word', function (msg) {
    doodlySelectWord(msg.word);
  });

  socket.on('wrong-guess', function (msg) {
    doodlyWrongGuess(msg);
  });

  socket.on('correct-guess', function (msg) {
    doodlyCorrectGuess(msg);
  });

  socket.on('doodly-new-round', function (data) {
    doodlyStartNewRound(data.round);
  });

  // UWO
  socket.on('GameStateChanged', function (gameData) {
    if (gameRoomId === gameData.id) {
      changeGameState(gameData);
    }
  });

  socket.on('PlayerWon', function (data) {
    clearInterval(timer);
    showUwoResult(data);
  });

  socket.on('anotherOne', function (data) {
    if (gameRoomId === data.gameRoomId) {
      $('#' + data.anotherId).append('<i class="fa fa-check" style="color: #0fb0ec !important"></i>');
    }
  });

  socket.on('PlayerJoined', function (data) {
    startGame(data);
  });

  socket.on('update-uwo-game-player', function (playerIds) {
    gamePlayerIds = playerIds;
    acceptedCount = gamePlayerIds.length;
    initializePlayers(globalGame, true);
  });

  // PB n J
  socket.on('review-card', function (data) {
    reviewCard(data);
  });

  socket.on('select-winner', function (data) {
    selectWinner(data);
  });

  socket.on('start-humanity-game', function (data) {
    humanityStartNewRound(data);
  });

  socket.on('result-humanity-game', function (data) {
    resultHumanityGame(data);
  });

  // Love or Not
  socket.on('game-manager', function () {
    gameManager = true;
  });

  socket.on('choose-state', function (data) {
    chooseState(data);
  });

  socket.on('love-hate-new-round', function (round) {
    loveHateStartNewRound(round);
  });

  // Guess Who
  socket.on('guess-who-new-round', function (data) {
    guessWhoStartNewRound(data.round, data.statement);
  });

  socket.on('guess-who-duplicate-statement', function (num) {
    guessWhoDuplicateStatement(num);
  });

  socket.on('guess-who-finish-input', function (playerId) {
    guessWhoFinishInput(playerId);
  });

  socket.on('guess-who-vote', function (msg) {
    guessWhoVote(msg)
  });

  socket.on('guess-who-end-game', function () {
    endGame();
  });

  // Codename
  socket.on('codename-flip', function (data) {
    codeFlip(data);
  });

  socket.on('submit-clue', function (data) {
    submitClue(data);
  });

  // Air Hockey
  socket.on('air-hockey-info', function (data) {
    airHockeyInfo(data);
  });

  socket.on('air-hockey-begin', function () {
    updateAirHockeyBoard();
  });

  socket.on('air-hockey-notify', function (data) {
    airHockeyNotify(data);
  });

  socket.on('air-hockey-score', function (data) {
    airHockeyScore(data);
  });

  socket.on('air-hockey-end-game', function () {
    endGame();
  });

  // Play Video
  socket.on('search-video', function (result) {
    addVideo(result);
  });

  socket.on('select-video', function (data) {
    selectedVideo(data);
  });

  socket.on('guest-can-play-song', function (val) {
    guestCanPlayVideo(val);
  });

  socket.on('play-pause-video', function (val) {
    playPauseVideo(val);
  });

  // Socket related to coin
  socket.on('earned-coin', function (data) {
    earnedCoin(data);
    pioneerAnalytics.active();
  });

  socket.on('buy-furniture', function (data) {
    purchaseItem(data);
    pioneerAnalytics.active();
  });

  socket.on('get-user-profile', function (data) {
    $('#right-menu-friends-number').text(data.totalFriendsNum + " Friends");

    //Checks if the user is verified
    if (data.verifiedStatus == true) {
      $('#right-menu-verified-badge').removeClass("d-none");
    } else {
      $('#right-menu-verified-badge').addClass("d-none");
    }

    //Checks if the user has a bio
    if (data.bio) {
      $('#right-menu-friends-bio').removeClass("d-none");
      $('#right-menu-friends-bio').text(data.bio);
    } else {
      $('#right-menu-friends-bio').addClass("d-none");
    }
  });

  socket.on('check-daily-reward', function (data) {
    initDailyRewardCheck(data.validClaim);
  });

  socket.on('claim-daily-reward', function (data) {
    userDailyRewardGet(data);
  });

  socket.on('get-shop-items', function (data) {
    addShopItems(data);
  });

  socket.on('get-mutual-friends', function (data) {
    mutualFriendsQuickAdd(data);
  });

  socket.on('get-friend-suggestion-data', function (data) {
    suggestedFriendsVisualAdd(data);
  });

  socket.on('get-coin-gifts', function (data) {
    allowClaimGift(data);
  });

  socket.on('claim-coin-gift', function (data) {
    addCoinGift(data);
  });

  socket.on('get-coin-send-ability', function (data) {
    allowCoinGift(data);
  });

  // Room explore
  socket.on('change-room-settings', function () {
    $.notify('Room options saved');
  });

  socket.on('change-locked', function (data) {
    if (data) {
      $.notify('Room locked');
    } else {
      $.notify('Room unlocked');
    }
  });

  socket.on('get-events', function (data) {
    getEvents(data);
  });

  socket.on('get-event-details', function (data) {
    loadEventDetails(data);
  });

  socket.on('public-room-list', function (roomList) {
    setPublicRoomList(roomList);
  });

  socket.on('locked-room', function (playerId) {
    lockedRoom(playerId);
  });

  socket.on('full-room', function (playerId) {
    lockedRoom(playerId);
  });

  socket.on('unlocked-room', function (playerId) {
    unlockedRoom(playerId);
  });
  
  socket.on('get-richup', function (data) {
    //Checking if the player is sitting
    if (ownId in seatStates) {
      setupRichUp(data);
    }
  });

  socket.on('event-response-update', function (data) {
    $.notify(`Invite response updated`);
  });
}


/**
 * Send message
 */
function sendMessage(msg) {
  // If scene isn't rendered yet, don't move(update position)
  if (!renderedScene && msg.type == 'update-position') {
    return;
  }
  if (msg.data?.goHomeToPlaza && sceneName != 'home' ||
    msg.data?.goCoffeeShopToPlaza && sceneName != 'shop' ||
    msg.data?.goPlazaToPizza && sceneName != 'plaza' ||
    msg.data?.goPizzaToPlaza && sceneName != 'pizza'
  ) {
    return;
  }
  // Now the user is moving to another scene
  if (disableAction) {
    return;
  }
  if (gamePlayerState && (msg.type == 'update-position' || msg.type == 'sit-down')) {
    return;
  }
  if (msg.type == 'home-to-plaza' ||
    msg.type == 'plaza-to-home' ||
    msg.type == 'plaza-to-shop' ||
    msg.type == 'shop-to-plaza' ||
    msg.type == 'plaza-to-pizza' ||
    msg.type == 'pizza-to-plaza') {
    disableAction = true;
  }
  if (socket && socket.connected) {
    socket.emit(msg.type, msg.data);
  }
}