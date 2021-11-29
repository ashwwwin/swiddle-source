document.addEventListener('contextmenu', event => {
  if (!$(event.target).is('p')) {
    event.preventDefault();
  } else {
    return false;
  }
});

// Body width, it's for resize window event
var bodyWidth;

// User can't use this address
var blackAddressList = ['simple', 'privacy', 'terms', 'default', 'plaza', 'pizza', 'coffee', 'arcade', 'park', 'threatre', 'auditorium', 'cinema', 'lounge', 'nightclub', 'pier', 'pets'];

//Variable to check if user is using desktopApp;
var desktopApp = false;
if (window.todesktop) {
  desktopApp = true;
}

var config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
  },
  width: window.innerWidth,
  height: window.innerHeight - 54,
  parent: 'container',
  render: {
    powerPreference: 'high-performance'
  },
  dom: {
    createContainer: true
  },
  scene: {
    preload: mainPreload,
    create: create,
    update: update,
    extend: {
      createSpeechBubble: createSpeechBubble,
      createContainer: createContainer,
      changeScene: changeScene,
      createNewInventory: createNewInventory,
      lazyLoading: lazyLoading
    }
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: true
    }
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
};

// Check if player is logged with snap
var scene;
var background;
var personData = {};
var playerInfoList = {};
var containerList = {};
// Variables for full screen video mode
var fullscreenCamera = false;
var fullscreenCameraSize = {
  1: [[630, 354], [630, 354]],
  2: [[410 * 2, 273], [410, 273]],
  3: [[268 * 3, 222], [268, 222]],
  4: [[278 * 2, 160 * 2], [278, 160]],
  5: [[278 * 3, 160 * 2], [278, 160]],
  6: [[278 * 3, 160 * 2], [278, 160]],
  8: [[228 * 4, 160 * 2], [228, 160]],
  9: [[180 * 5, 160 * 2], [228, 160]],
  10: [[180 * 5, 160 * 2], [180, 160]],
}
// My player id
var ownId = null;
var isHomeOwner = false;
var messageBox = $('#message-box');
var typeHint = $('#type-hint');
var isMessageInput = true;
var targetPoints = {};
// It's variable to store enable video when leave home
var changeVideoStatus = false;
var optVideoStatus = {};
var socket;
var seatList = {};
var seatStates = {};
var videoEllipses = {};
var tweens = {};
var hideSpeechTimer = {};
var scale = 1;
var avatarHeight = 260;
// Variables for communication ellipse
var cmtEllipseWidth = avatarHeight * 6;
var cmtEllipseHeight = avatarHeight * 1.8;
// Variables for moving communication ellipse
var movingCmtEllipseWidth = avatarHeight * 6;
var movingCmtEllipseHeight = avatarHeight * 1.8;
// targetRadian is the max distance between each player
var targetRadian = avatarHeight * 0.1;
// Variables for speaker size
var speakerWidth = avatarHeight * 0.125;
// Wall height at home
var roomWallHeight = 250;
var bubbleSpeechWidth = 220;
var moveSpeed = avatarHeight / 800;
var moveSteps = {};

var sceneName;

// Variable for knock
var sentKnock = false;
var enterHome = false;
var passwordLength = 6;
var ring;

// Variable for doors
var homeToPlazaDoor;
var homeToPlazaDoorPosX;
var homeToPlazaDoorPosY;
var homeToPlazaDoorWidth;
var homeToPlazaDoorHeight;

// Wall height at plaza
var plazaWallHeight = 490;

var plazaToHomeDoor;
var plazaToHomeDoorPosX = 2080;
var plazaToHomeDoorPosY = 235;
var plazaToHomeDoorWidth = 225;
var plazaToHomeDoorHeight = 260;

// Wall height at coffee shop
var coffeeShopWallHeight = 260;

var shopToPlazaDoor;
var shopToPlazaDoorPosX = 760;
var shopToPlazaDoorPosY = 25;
var shopToPlazaDoorWidth = 135;
var shopToPlazaDoorHeight = 220;

// Door to enter from plaza to coffee shop
var plazaToShopDoor;
var plazaToShopDoorPosX = 515;
var plazaToShopDoorPosY = 185;
var plazaToShopDoorWidth = 125;
var plazaToShopDoorHeight = 295;

// Door to enter pizza
var plazaToPizzaDoor;
var plazaToPizzaDoorPosX = 1465;
var plazaToPizzaDoorPosY = 215;
var plazaToPizzaDoorWidth = 130;
var plazaToPizzaDoorHeight = 265;

// Wall height at pizza
var pizzaWallHeight = 250;

// Door at pizza
var pizzaToPlazaDoor;
var pizzaToPlazaDoorPos = [
  [130, 290],
  [130, 660],
  [35, 830],
  [35, 395],
];

var seatTable;

function mainPreload() {
  this.load.image('home', '/images/blank.png');
  this.load.image('home-design', '/images/blank.png');
  this.load.image('default_avatar', '/images/default_avatar.png');
  this.load.image('speaker', '/images/speaker.png');
  this.load.image('home-design-icon', '/images/icons/home-design.png');
  this.load.image('global-settings', '/images/icons/global-settings.png');
  this.load.image('calendar-icon', '/images/icons/calendar-icon.png');
  this.load.audio('ring', '/sounds/ring.mp3');

  // Load furniture image
  for (furnitureName in furnitureList) {
    this.load.image(furnitureName, `/images/home-assets/${furnitureList[furnitureName].imageUrl}`);
  }

  this.load.plugin('rexinputtextplugin', '/libs/rexinputtextplugin.min.js', true);
  this.load.plugin('rexpathfollowerplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexpathfollowerplugin.min.js', true);
}

function create() {
  // Add ring audio
  this.sound.pauseOnBlur = false;
  ring = this.sound.add('ring');

  // Add background image
  background = this.add.image(0, 0, 'home');
  var scaleX = this.cameras.main.width / background.width;
  var scaleY = this.cameras.main.height / background.height;
  scale = Math.max(scaleX, scaleY);
  background.setScale(scale).setOrigin(0).setInteractive({ pixelPerfect: true });
  this.load.on('filecomplete', update_avatar, this);

  // Set main camera's bound
  this.cameras.main.setBounds(0, 0, background.width * scale, background.height * scale);

  seatTable = this.add.container();

  // Reset variables by scale
  avatarHeight *= scale;
  targetRadian *= scale;
  cmtEllipseWidth *= scale;
  cmtEllipseHeight *= scale;
  movingCmtEllipseWidth *= scale;
  movingCmtEllipseHeight *= scale;
  roomWallHeight *= scale;
  moveSpeed *= scale;
  // bubbleSpeechWidth *= scale;
  speakerWidth *= scale;
  coffeeShopWallHeight *= scale;
  plazaWallHeight *= scale;

  plazaToHomeDoorPosX *= scale;
  plazaToHomeDoorPosY *= scale;
  plazaToHomeDoorWidth *= scale;
  plazaToHomeDoorHeight *= scale;

  shopToPlazaDoorPosX *= scale;
  shopToPlazaDoorPosY *= scale;
  shopToPlazaDoorWidth *= scale;
  shopToPlazaDoorHeight *= scale;

  plazaToShopDoorPosX *= scale;
  plazaToShopDoorPosY *= scale;
  plazaToShopDoorWidth *= scale;
  plazaToShopDoorHeight *= scale;

  plazaToPizzaDoorPosX *= scale;
  plazaToPizzaDoorPosY *= scale;
  plazaToPizzaDoorWidth *= scale;
  plazaToPizzaDoorHeight *= scale;

  pizzaWallHeight *= scale;

  trashBoxWidth *= scale;
  furnitureShopButtonWidth *= scale;

  for (var i = 0; i < pizzaToPlazaDoorPos.length; i++) {
    pizzaToPlazaDoorPos[i][0] *= scale;
    pizzaToPlazaDoorPos[i][1] *= scale;
  }

  plazaToHomeDoor = this.add.rectangle(plazaToHomeDoorPosX, plazaToHomeDoorPosY, plazaToHomeDoorWidth, plazaToHomeDoorHeight);
  plazaToHomeDoor.setOrigin(0, 0).setVisible(false).setInteractive({ useHandCursor: true });
  plazaToHomeDoor.on('pointerdown', function (pointer, _x, _y, event) {
    if ($(pointer.downElement).parent().attr('id') != 'container') {
      return;
    }
    event.stopPropagation();
    // Check if click left button
    if (pointer.button != 0) {
      $('#go-to-another-scene').siblings('.popup-menu').css({ 'top': pointer.event.y, 'left': pointer.event.x });
      $('#go-to-another-scene').dropdown('show');
      $('#move-to-scene').text('Go Home').off().click(goPlazaToHome);
      return
    }

    goPlazaToHome();

    mixpanel.track('Plaza to Home', {
      'ownId': ownId
    });
  });

  shopToPlazaDoor = this.add.rectangle(shopToPlazaDoorPosX, shopToPlazaDoorPosY, shopToPlazaDoorWidth, shopToPlazaDoorHeight);
  shopToPlazaDoor.setOrigin(0, 0).setVisible(false).setInteractive({ useHandCursor: true });
  shopToPlazaDoor.on('pointerdown', function (pointer, _x, _y, event) {
    if ($(pointer.downElement).parent().attr('id') != 'container') {
      return;
    }
    event.stopPropagation();
    // Check if click left button
    if (pointer.button != 0) {
      $('#go-to-another-scene').siblings('.popup-menu').css({ 'top': pointer.event.y, 'left': pointer.event.x });
      $('#go-to-another-scene').dropdown('show');
      $('#move-to-scene').text('Go to Plaza').off().click(goCoffeeShopToPlaza);
      return
    }

    goCoffeeShopToPlaza();

    mixpanel.track('Coffee to Plaza', {
      'ownId': ownId
    });
  });

  plazaToShopDoor = this.add.rectangle(plazaToShopDoorPosX, plazaToShopDoorPosY, plazaToShopDoorWidth, plazaToShopDoorHeight);
  plazaToShopDoor.setOrigin(0, 0).setVisible(false).setInteractive({ useHandCursor: true });
  plazaToShopDoor.on('pointerdown', function (pointer, _x, _y, event) {
    if ($(pointer.downElement).parent().attr('id') != 'container') {
      return;
    }
    event.stopPropagation();
    // Check if click left button
    if (pointer.button != 0) {
      $('#go-to-another-scene').siblings('.popup-menu').css({ 'top': pointer.event.y, 'left': pointer.event.x });
      $('#go-to-another-scene').dropdown('show');
      $('#move-to-scene').text('Enter the Coffee Shop').off().click(goPlazaToCoffeeShop);
      return
    }

    goPlazaToCoffeeShop();

    mixpanel.track('Plaza to Coffee', {
      'ownId': ownId
    });
  });

  plazaToPizzaDoor = this.add.rectangle(plazaToPizzaDoorPosX, plazaToPizzaDoorPosY, plazaToPizzaDoorWidth, plazaToPizzaDoorHeight);
  plazaToPizzaDoor.setOrigin(0, 0).setVisible(false).setInteractive({ useHandCursor: true });
  plazaToPizzaDoor.on('pointerdown', function (pointer, _x, _y, event) {
    if ($(pointer.downElement).parent().attr('id') != 'container') {
      return;
    }
    event.stopPropagation();
    // Check if click left button
    if (pointer.button != 0) {
      $('#go-to-another-scene').siblings('.popup-menu').css({ 'top': pointer.event.y, 'left': pointer.event.x });
      $('#go-to-another-scene').dropdown('show');
      $('#move-to-scene').text('Enter The Pizzeria').off().click(goPlazaToPizza);
      return
    }

    goPlazaToPizza();

    mixpanel.track('Plaza to Pizza', {
      'ownId': ownId
    });
  });

  pizzaToPlazaDoor = this.add.polygon(0, 0, pizzaToPlazaDoorPos);
  pizzaToPlazaDoor.setOrigin(0, 0).setVisible(false).setInteractive(
    new Phaser.Geom.Polygon(pizzaToPlazaDoorPos),
    Phaser.Geom.Polygon.Contains,

  ).input.cursor = 'pointer';
  pizzaToPlazaDoor.on('pointerdown', function (pointer, _x, _y, event) {
    if ($(pointer.downElement).parent().attr('id') != 'container') {
      return;
    }
    event.stopPropagation();
    // Check if click left button
    if (pointer.button != 0) {
      $('#go-to-another-scene').siblings('.popup-menu').css({ 'top': pointer.event.y, 'left': pointer.event.x });
      $('#go-to-another-scene').dropdown('show');
      $('#move-to-scene').text('Go to The Plaza').off().click(goPizzaToPlaza);
      return
    }

    goPizzaToPlaza();

    mixpanel.track('Pizza to Plaza', {
      'ownId': ownId
    });
  });

  // Initialize socket and handlers
  socket = io();

  scene = this;

  // Initialize first position
  personData = {
    id: sessionStorage.getItem('id'),
    name: sessionStorage.getItem('name'),
    avatar: sessionStorage.getItem('avatar'),
    roomId: roomId,
    posX: 0,
    posY: 0,
    lastMsg: '',
    enableAudio: enableAudio
  };

  // Store own player's ID
  ownId = personData.id;
  isHomeOwner = (homeOwner._id == ownId);

  //Identifying the userId for analytics & ignoring development mode
  if (window.location.host != 'swiddle.io') {
    pioneerAnalytics.identify("Development");
  } else {
    pioneerAnalytics.identify(ownId);
  }

  setupSocket();

  //Shows the messageBox
  messageBox.show();


  // Listen Mouse Event
  background.on('pointerdown', function (pointer) {
    if ($(pointer.downElement).parent().attr('id') != 'container') {
      return;
    }

    if (sceneName == 'home-design' && dragStart) {
      return;
    }

    // Hide right sidebar and add player modal
    $('#my-friends-container').removeClass('show');
    selectedFriendId_store();
    friendListOpen = false;
    messageBox.blur();
    messageBox.show();
    ytClose();

    // Check if click left button
    if (pointer.button != 0) { return }

    var posX = pointer.worldX;
    var posY = pointer.worldY;
    if ((sceneName == 'home' && posY < roomWallHeight) || (sceneName == 'home-design' && posY < roomWallHeight) || (sceneName == 'shop' && posY < coffeeShopWallHeight) || (sceneName == 'plaza' && posY < plazaWallHeight) || (sceneName == 'pizza' && posY < pizzaWallHeight))
      return;

    posY -= avatarHeight / 2;
    for (id in targetPoints) {
      if (id != ownId && !seatStates[id] && targetPoints[id].contains(posX, posY))
        return;
    }
    sendMessage({
      type: 'update-position',
      data: {
        posX: posX / scale,
        posY: posY / scale
      }
    });
  }, this);

  // Input box handling to send message
  this.input.keyboard.on('keyup-ENTER', function () {
    if (!enterHome || gamePlayerState || $('body').hasClass('modal-open') || sceneName == 'home-design' || $('#my-friends-container').hasClass('show')) return;
    if (messageBox.val().length > 0) {
      sendMessage({
        type: 'update-message',
        data: messageBox.val()
      });
      messageBox.val('');
      messageBox.blur();
    } else {
      messageBox.focus();
    }
  });

  this.input.keyboard.on('keyup-ESC', function () {
    //Hides friend system
    $('#my-friends-container').removeClass('show');
    selectedFriendId_store();
    friendListOpen = false;

    //Hides the focus and shows the message box
    messageBox.show();
    messageBox.blur();

    //Closes the game menu
    $('#choose-game-panel-close').click();

    //Closes the settings menu
    $('#user-settings-screen .btn-close').click();

    ytClose();

  });

  //Adds the events button, as well as the button functionality
  goToEvents = this.add.image(20, scene.cameras.main.height - 95, 'calendar-icon').setScrollFactor(0);
  goToEvents.setOrigin(0, 1).setScale(goToEventsWidth / goToEvents.width).setDepth(1000).setInteractive({ useHandCursor: true });
  goToEvents.on('pointerdown', function (pointer, _x, _y, event) {
    openEvents();
  });

  //Adds the home designer button, as well as the button functionality
  goToDesign = this.add.image(20, scene.cameras.main.height - 165, 'home-design-icon').setScrollFactor(0);
  goToDesign.setOrigin(0, 1).setScale(goToDesignWidth / goToDesign.width).setDepth(1000).setInteractive({ useHandCursor: true });
  goToDesign.on('pointerdown', function () {
    sendMessage({
      type: 'home-to-design',
    });
  });

  roomSetting = this.add.image(20, scene.cameras.main.height - 25, 'global-settings').setScrollFactor(0);
  roomSetting.setOrigin(0, 1).setScale(roomSettingWidth / roomSetting.width).setDepth(1000).setInteractive({ useHandCursor: true });
  roomSetting.on('pointerdown', function () {
    $('#setting-room-modal').modal('show');
  });

  lazyLoading();
}

function update(_time, _delta) {
  // messageBox.focus();
  // // As messageBox.setVisible would require some ms to render, we set focus in update callback
  // if (!enterHome || gamePlayerState || $('body').hasClass('modal-open')) return;
  // if (isMessageInput) {
  //   messageBox.focus();
  // } else {
  //   messageBox.blur();
  // }
}

/**
* Create bubble box
*/
function createSpeechBubble(playerId, maxWidth, quote) {
  var container = containerList[playerId];

  if (!container) {
    return;
  }

  // hide before speech bubble
  hideSpeechBubble(playerId);
  var content = this.add.text(0, 0, quote, {
    fontFamily: 'Nunito',
    fontWeight: 700,
    fontSize: 16,
    color: '#000000',
    align: 'center',
    wordWrap: {
      width: maxWidth - 8,
      useAdvancedWrap: true
    }
  }).setOrigin(0.5);
  content.setPosition(0, -(content.displayHeight / 2 + avatarHeight / 2 - 4)).setResolution(2);
  var bubble = this.add.graphics({ x: -(content.displayWidth / 2 + 8), y: -(content.displayHeight + avatarHeight / 2) });
  bubble.fillStyle(0xfafafa, 1);
  bubble.lineStyle(3, 0xf2f2f2, 1);
  bubble.fillRoundedRect(0, 0, content.displayWidth + 16, content.displayHeight + 10, 5).alpha = 0.8;
  bubble.strokeRoundedRect(0, 0, content.displayWidth + 16, content.displayHeight + 10, 5).alpha = 1;
  bubble.globalAlpha = 0.2;
  container.add([bubble, content]);

  //Checks length of message
  var messageLength = (content._text).length
  var messageDuration;

  //Calculates how long the speech bubble should appear for
  if (messageLength < 30) {
    messageDuration = 3000;
  } else {
    messageDuration = 3000 + (messageLength - 30) * 70;
  }

  //Hides the speech bubble
  hideSpeechTimer[playerId] = this.time.delayedCall(messageDuration, hideSpeechBubble, [playerId]);

  //Hides Speaker image
  container.getAt(1).setVisible(false);
};

/**
* Timer callback to hide speech bubble
*/
function hideSpeechBubble(playerId) {
  var container = containerList[playerId];

  if (!container) {
    return;
  }

  if (container.list.length > 3) {
    if (container.getAt(3)) container.getAt(3).destroy();
    if (container.getAt(2)) container.getAt(2).destroy();
  }
  if (hideSpeechTimer[playerId]) {
    hideSpeechTimer[playerId].destroy();
  }
}

function changeScene() {
  // this.cameras.main.fadeIn(500);
  background.setTexture(sceneName);
  this.cameras.main.setBounds(0, 0, background.width * scale, background.height * scale);
}

function formatRemovedPlayer(playerId) {
  $('#knock-' + playerId).remove();
  $('#invitation-' + playerId).remove();
  // $('#add-friend-' + playerId).remove();
  if ($('#show-player-settings').siblings('.popup-menu').data('playerId') == playerId) {
    $('#show-player-settings').dropdown('hide');
  }

  if (containerList[playerId]) {
    if (tweens[playerId]) tweens[playerId].remove();
    if (containerList[playerId]) containerList[playerId].destroy();
  }
  if (seatStates[playerId]) {
    seatList[seatStates[playerId].tableId][seatStates[playerId].pos].empty = true;
    delete seatStates[playerId];
  }
  delete playerInfoList[playerId];
  delete targetPoints[playerId];
  delete videoEllipses[playerId];
  if (speechEvents[playerId]) {
    speechEvents[playerId].stop();
  }
}

function removeAllPlayers() {
  for (playerId in tweens) {
    tweens[playerId].remove();
  }
  for (playerId in containerList) {
    containerList[playerId].destroy();
  }
  // closeAllConnections();
  containerList = {};
  seatList = {};
  seatStates = {};
  optVideoStatus = {};
  playerInfoList = {};
  targetPoints = {};
  videoEllipses = {};
  for (playerId in speechEvents) {
    speechEvents[playerId].stop();
  }
  // $('.invitation-container').remove();
  // $('.add-firend-container').remove();
  $('.camera-item').not(`#${ownId}`).addClass('d-none');
}

/**
* Create a phaser container to store Person Detail
*/
function createContainer(personInfo) {
  var container = this.add.container(personInfo.posX, personInfo.posY).setDepth(personInfo.posY);
  var avatarKey;

  containerList[personInfo.id] = container;

  if (!personInfo.avatar || personInfo.avatar == 'undefined') {
    avatarKey = 'default_avatar';
  } else if (this.textures.exists(personInfo.id)) {
    avatarKey = personInfo.id;
  } else {
    avatarKey = 'default_avatar';
    this.load.image(personInfo.id, personInfo.avatar);
    this.load.start();
  }
  var avatar = this.add.image(0, 0, avatarKey);
  container.add([avatar]);
  avatar.setScale(avatarHeight / avatar.height);
  if (personInfo.seatPos != null) {
    avatar.setCrop(0, 0, avatar.width, avatar.height / 2);
    try {
      container.setPosition(seatList[personInfo.seatTableId][personInfo.seatPos]?.posX, seatList[personInfo.seatTableId][personInfo.seatPos]?.posY).setDepth(seatList[personInfo.seatTableId][personInfo.seatPos]?.posY);
    } catch (error) {
      console.error();
    }
  }
  bindRightClick(personInfo.id, avatar);
  var speaker = this.add.image(0, 0, 'speaker');
  speaker.setScale(speakerWidth / speaker.width).setY(-avatarHeight * 0.45).setAlpha(0.5).setVisible(false);
  container.add(speaker);
  if (personInfo.lastMsg.length >= 1) {
    this.createSpeechBubble(personInfo.id, bubbleSpeechWidth, personInfo.lastMsg);
  }
};

/**
 * Lazy loading
 */
function lazyLoading() {
  scene.load.image('shop', '/images/coffeeShop.png');
  scene.load.image('plaza', '/images/plaza.png');
  scene.load.image('pizza', '/images/pizza.png');

  scene.load.image('box', '/images/icons/box.png');
  scene.load.image('open-box', '/images/icons/open-box.png');

  scene.load.image('shop-furniture', '/images/icons/shop-furniture.png');

  scene.load.start();
}

/**
* Callback function for async avatar loading
*/
function update_avatar(key, _type, _texture) {
  if (key == 'box') {
    initTrashBox();
    return;
  }

  if (key == 'shop-furniture') {
    initFurnitureShop();
    return;
  }

  containerList[key]?.getAt(0)?.setTexture(key);
}

/**
* Bind click event to avatar
*/
function bindRightClick(playerId, avatar) {
  avatar.setInteractive({ useHandCursor: true, pixelPerfect: true });

  avatar.on('pointerdown', function (pointer, _x, _y, event) {
    if ($(pointer.downElement).parent().attr('id') != 'container') {
      return;
    } else {

    }

    // Check if click right button
    if (pointer.button != 2) {
      return;
    }

    event.stopPropagation();
    pointer.event.stopPropagation();
    pointer.event.preventDefault();

    //Resets any previously loaded data
    $('#right-menu-verified-badge').addClass("d-none");
    $('#right-menu-friends-bio').text("");
    $('#right-menu-friends-number').text("");

    var playerInfo = playerInfoList[playerId];
    //Check if player is right clicking on themselves
    if (playerId == ownId) {
      //Sets the name
      $('#show-player-settings').siblings('.popup-menu').find('.player-name').text("You");

      //Hides the options buttons
      $('#right-menu-buttons').removeClass('d-flex').addClass('d-none');

      //Hides the volume button
      $('#right-menu-volume').hide();
    } else {
      //Sets the name
      $('#show-player-settings').siblings('.popup-menu').find('.player-name').text(playerInfo.name);

      //Shows the volume button
      $('#right-menu-volume').show();
    }

    //Sets the avatar
    $('#show-player-settings').siblings('.popup-menu').find('.friend-avatar').css('background-image', `url(${playerInfo.avatar})`);

    $('#show-player-settings').siblings('.popup-menu').data('playerId', playerId).css({ 'top': pointer.event.y, 'left': pointer.event.x });

    if (personData.guest) {
      $('#right-menu-buttons').removeClass('d-flex').addClass('d-none');
    } else if (playerId != ownId) {
      $('#right-menu-buttons').addClass('d-flex').removeClass('d-none');
    }

    //Check if player is guest
    if (playerInfo.guest) {
      $('#invite-player').hide();
      $('#right-menu-friends-number').hide();
    } else {
      $('#invite-player').show();
      $('#right-menu-friends-number').show();
      sendMessage({
        type: 'get-user-profile',
        data: playerId
      });
    }

    //Check if user is friends with selected user or a guest
    if (friendIds.includes(playerId) || playerInfo.guest) {
      $('#add-friend').hide();
    } else {
      $('#add-friend').show();
    }

    if (friendIds.includes(playerId) && !pendingRequestIds.includes(playerId)) {
      $('#chat-friend').show();
      $('#remove-friend').show();
    } else {
      $('#chat-friend').hide();
      $('#remove-friend').hide();
    }

    $('#show-player-settings').dropdown('show');

    return false;

  });
}

/**
* Convert decimal to hex
*/
function dec2hex(dec) {
  return dec.toString(16).padStart(2, '0')
}

/**
* Generate random string
*/
function generateRandomString(len) {
  var arr = new Uint8Array((len || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, dec2hex).join('')
}

$(document).on('click', '.accept-knock', function () {
  var $container = $(this).parents('.knock-notify-container');
  sendMessage({
    type: $container.hasClass('ring-friend-container') ? 'accept-ring-friend' : 'accept-knock',
    data: $container.data('id')
  });
  $container.remove();
});

$(document).on('click', '.ignore-knock', function () {
  var $container = $(this).parents('.knock-notify-container');
  sendMessage({
    type: $container.hasClass('ring-friend-container') ? 'ignore-ring-friend' : 'ignore-knock',
    data: $container.data('id')
  });
  $container.remove();
});

$(document).on('click', '.accept-invitation', function () {
  var $container = $(this).parents('.invitation-container');
  sendMessage({
    type: 'accept-invitation',
    data: {
      playerId: $container.data('id'),
      address: $container.data('address'),
      friend: $container.hasClass('friend-invitation'),
    }
  });
  $container.remove();
  startLoading();
});

$(document).on('click', '.ignore-invitation', function () {
  var $container = $(this).parents('.invitation-container');
  sendMessage({
    type: 'ignore-invitation',
    data: {
      playerId: $container.data('id'),
      friend: $container.hasClass('friend-invitation'),
    },
  });
  $container.remove();
});

$(document).on('mousedown', '.camera-container', function (e) {
  if (e.which != 3) {
    return false;
  }
  const playerId = $(this).parent('.camera-item').attr('id');
  var playerInfo = playerInfoList[playerId];

  //Check if player is right clicking on themselves
  if (playerId == ownId) {
    //Sets the name
    $('#show-player-settings').siblings('.popup-menu').find('.player-name').text("You");

    //Hides the options buttons
    $('#right-menu-buttons').removeClass('d-flex').addClass('d-none');

    //Hides the volume button
    $('#right-menu-volume').hide();
  } else {
    //Sets the name
    $('#show-player-settings').siblings('.popup-menu').find('.player-name').text(playerInfo.name);

    //Shows the volume button
    $('#right-menu-volume').show();
  }

  //Sets the avatar
  if (playerInfo.avatar) {
    $('#show-player-settings').siblings('.popup-menu').find('.friend-avatar').css('background-image', `url(${playerInfo.avatar})`);
  } else {
    $('#show-player-settings').siblings('.popup-menu').find('.friend-avatar').css('background-image', 'url(/images/default_avatar.png)');
  }

  //Resets any previously loaded data
  $('#right-menu-verified-badge').addClass("d-none");
  $('#right-menu-friends-bio').text("");
  $('#right-menu-friends-number').text("");

  $('#show-player-settings').siblings('.popup-menu').data('playerId', playerId).css({ 'top': e.clientY, 'left': e.clientX });

  if (personData.guest) {
    $('#right-menu-buttons').removeClass('d-flex').addClass('d-none');
  } else if (playerId != ownId) {
    $('#right-menu-buttons').addClass('d-flex').removeClass('d-none');
  }

  //Check if player is guest
  if (playerInfo.guest) {
    $('#invite-player').hide();
    $('#right-menu-friends-number').hide();
  } else {
    $('#invite-player').show();
    $('#right-menu-friends-number').show();
    sendMessage({
      type: 'get-user-profile',
      data: playerId
    });
  }

  //Check if user is friends with selected user or a guest
  if (friendIds.includes(playerId) || playerInfo.guest) {
    $('#add-friend').hide();
  } else {
    $('#add-friend').show();
  }

  if (friendIds.includes(playerId) && !pendingRequestIds.includes(playerId)) {
    $('#chat-friend').show();
    $('#remove-friend').show();
  } else {
    $('#chat-friend').hide();
    $('#remove-friend').hide();
  }

  $('#show-player-settings').dropdown('show');
  return false;
});

$(function () {
  bodyWidth = $('body').width();
  cameraContainerWidth = Math.floor(bodyWidth / 10);
  cameraWidth = cameraContainerWidth / 16 * 21;
  cameraHeight = cameraContainerWidth / 32 * 31;

  $('.camera-container').css({
    width: cameraContainerWidth,
    height: cameraContainerWidth
  }).find('video').css({
    width: cameraWidth,
    height: cameraHeight,
  });

  var timerWidth = cameraContainerWidth + 30;
  $('.circle_animation').attr({
    r: timerWidth / 2 - 10,
    cx: timerWidth / 2,
    cy: timerWidth / 2,
  }).parent('svg').attr({
    width: timerWidth,
    height: timerWidth
  });

  $('#btn-knock').click(function () {
    //If the person is a guest
    //Checks if user is logged in based on whether they have a username
    if (personData.name == null && sentKnock == false) {
      if ($('#guest-name').val() == '') {
        personData.name = 'Guest';
      } else {
        personData.name = $('#guest-name').val();
      }
      personData.guest = true;
      $('#change-snapkit').remove();
      $('#share-access').remove();
      $('#add-friend').remove();
      $('#friend-list').remove();
      $('#coins-container').remove();
      $('#allow-guest-play-container').remove();
      $('#show-settings-button').remove();
      roomSetting.setVisible(false);
      

      sentKnock = true;
      sendMessage({
        type: 'knock-on',
        data: personData
      });

      ring.play();

    } else if (personData.name && sentKnock == false) {

      sentKnock = true;
      sendMessage({
        type: 'knock-on',
        data: personData
      });

      ring.play();
    }
  });

  $('#invite-dialog').click(function (e) {
    e.stopPropagation();
  });

  $('#copy-address').click(function () {
    $('#owner-address').select();
    document.execCommand('copy');
  });

  $('#copy-password').click(function () {
    $('#owner-password').select();
    document.execCommand('copy');
  });

  $('#enter-password').click(function (_e) {
    // Send home password
    if ($('#password-input').val()) {
      sendMessage({
        type: 'enter-password',
        data: $('#password-input').val()
      });
      //// spiner.spin(document.body);
    }
  });

  $('.custom-control.custom-checkbox').click(function () {
    var checked = $('#require-password').prop('checked');
    $('#require-password').prop('checked', !checked)
    sendMessage({
      type: 'require-password',
      data: !checked
    });
  });

  $('#change-password').click(function () {
    sendMessage({
      type: 'change-password',
      data: generateRandomString(passwordLength)
    });
  });

  $('#edit-address').click(function () {
    if ($('#owner-address').prop('readonly')) {
      $('#owner-address').prop('readonly', false).val(personData.roomId).select();
      $(this).removeClass('fa-pencil-square-o').addClass('fa-check-circle-o');
      return false;
    } else {
      var address = $('#owner-address').val();
      if (!address || !addressValidator.test(address)) {
        $.notify('Please enter your address correctly', {
          type: 'danger'
        });
        return false;
      }
      // Convert address for URI
      try {
        address = encodeURIComponent(decodeURIComponent(address).trim().toLowerCase());
      } catch {
        $.notify('This address format is wrong. Please enter another one.', {
          type: 'danger',
        });
        return false;
      }
      if (blackAddressList.includes(address)) {
        $.notify('This username is taken', {
          type: 'danger',
        });
        return false;
      }
      if (address == personData.roomId) {
        $('#owner-address').val(siteUrl + '/' + address);
        $('#owner-address').prop('readonly', true);
        $(this).addClass('fa-pencil-square-o').removeClass('fa-check-circle-o');
        return false;
      }
      //// spiner.spin(document.body);
      $.ajax({
        url: '/set-address',
        type: 'post',
        dataType: 'json',
        data: {
          id: ownId,
          address
        },
        success: function (result) {
          if (result) {
            sessionStorage.setItem('address', address);
            window.location.href = '/' + address;
          } else {
            // spiner.stop();
            $.notify('This username is taken', {
              type: 'danger',
            });
          }
        }
      });
    }
  });

  $('#choose-game-button').click(function () {
    $('#choose-game-panel-close').data('full-camera', fullscreenCamera);
    fullscreenCamera = false;
    $('#fullscreen-video-button').find('img').attr('src', '/images/extend.svg');
    $('.header').removeClass('dark');
    $('#full-cameras-container').removeClass('d-flex');
    initFullScreenVideoMode();

    $('.camera-item').filter(function () {
      return seatStates[$(this).attr('id')] && seatStates[$(this).attr('id')].tableId == playerSeatTableId;
    }).appendTo('#choose-game-cameras-container');
    $('#choose-game-panel').show();
    gamePlayerState = 'choose-game';
  });

  $('#choose-game-panel-close').click(function () {
    gamePlayerState = '';
    $('#choose-game-cameras-container .camera-item').appendTo('#cameras-container');
    $('#choose-game-panel').hide();
    if ($(this).data('full-camera')) {
      $('#fullscreen-video-button').click();
    }
  });

  $('#choose-game-list .choose-game-item').click(function () {
    $('#choose-game-list .choose-game-item.selected').removeClass('selected');
    $(this).addClass('selected');
    gameType = $(this).data('game');
    $("#choose-game-description").text(gameList[gameType].desc);
    return false;
  });

  $('#btn-play-game, #btn-continue-game').click(function () {
    $('#choose-game-panel-close').click();
    sendMessage({
      type: 'offer-game',
      data: {
        gameType,
        tableId: playerSeatTableId
      }
    });
    $('#btn-exit-game').prop('disabled', true);
  });

  $('#accept-play-game').click(function () {
    $('#choose-game-panel-close').click();
    sendMessage({
      type: 'accept-play-game',
      data: $('#play-game-modal').data('gameRoomId')
    });
    $('#play-game-modal').modal('hide');
  });

  $('#reject-play-game').click(function () {
    sendMessage({
      type: 'reject-play-game',
      data: $('#play-game-modal').data('gameRoomId')
    });
    $('#play-game-modal').modal('hide');
    endGame();
  });

  $('#eject-player').click(function () {
    sendMessage({
      type: 'eject-player',
      data: $('#show-player-settings').siblings('.popup-menu').data('playerId')
    });
  });

  $('#invite-player').click(function () {
    sendMessage({
      type: 'invite-player',
      data: $('#show-player-settings').siblings('.popup-menu').data('playerId')
    });
  });

  $('#remove-friend').click(function () {
    sendMessage({
      type: 'remove-friend',
      data: $('#show-player-settings').siblings('.popup-menu').data('playerId')
    });
  });

  $('#mute-player').click(function () {
    var playerId = $('#show-player-settings').siblings('.popup-menu').data('playerId');
    var audio = $(`#${playerId} audio`)[0];
    if (audio) {
      if ($(this).data('muted')) {
        audio.muted = false;
        $(this).text('Mute');
        $(this).data('muted', false);
      } else {
        audio.muted = true;
        $(this).text('Unmute');
        $(this).data('muted', true);
      }
    }
  });

  $('#logout').click(function () {
    mixpanel.track('Logout', {
      'ownId': ownId
    });
    logout();
  });

  $('#feedback-modal').on('show.bs.modal', function () {
    messageBox.hide();
    isMessageInput = false;
    typeHint.text('Press enter to type a message');
    $('#feedback-text').val('');
  });

  $('#feedback-modal').on('shown.bs.modal', function () {
    $('#feedback-text').focus();
  });

  $('#feedback-text').keyup(function (e) {
    e.preventDefault();
  });

  $('#send-feedback').click(function () {
    if (!$('#feedback-text').val()) {
      $.notify('Please enter feedback.', {
        type: 'danger',
      });
      $('#feedback-text').focus();
      return;
    }
    $.ajax({
      url: '/feedback',
      type: 'post',
      dataType: 'json',
      data: {
        feedback: $('#feedback-text').val(),
        userId: ownId
      },
      success: function () {
        $.notify('Your feedback is sent successfully.', {
          type: 'success',
        });
      }
    });
    $('#feedback-modal').modal('hide');
  });

  $('#send-suggest-game').click(function () {
    if (!$('#suggest-game-text').val()) {
      $.notify('Please enter feedback.', {
        type: 'danger',
      });
      $('#suggest-game-text').focus();
      return;
    }
    $.ajax({
      url: '/feedback',
      type: 'post',
      dataType: 'json',
      data: {
        feedback: $('#suggest-game-text').val(),
        userId: ownId
      },
      success: function () {
        $.notify('Your feedback is sent successfully.', {
          type: 'success',
        });
      }
    });
    $('#suggest-game-modal').modal('hide');
  });

  $('#sit-down').click(function () {
    sitDown($(this).data('tableId'), $(this).data('pos'));
  });

  $('.dropdown-menu').click(function (e) {
    e.preventDefault();
  });

  $('#fullscreen-video-button').click(function () {
    mixpanel.track('Fullscreen Video Mode', {
      'ownId': ownId
    });

    fullscreenCamera = !fullscreenCamera;
    if (fullscreenCamera) {
      $(this).find('img').attr('src', '/images/fullscreen.svg');
      $('.header').addClass('dark');
      $('#full-cameras-container').addClass('d-flex');
      $('#coins-container').addClass('d-none');
    } else {
      $(this).find('img').attr('src', '/images/extend.svg');
      $('.header').removeClass('dark');
      $('#full-cameras-container').removeClass('d-flex');
      $('#coins-container').removeClass('d-none');
    }
    initFullScreenVideoMode();
  });
});

var initFullScreenVideoMode = function () {
  if (gamePlayerState) {
    return
  }

  if (fullscreenCamera) {
    var cameraCount = $('.camera-item:not(.d-none)').length;
    if (cameraCount <= 0) {
      $('#full-cameras-container .enable-your-video').removeClass('d-none');
      return;
    }
    $('#full-cameras-container .enable-your-video').addClass('d-none');
    var totalSize = fullscreenCameraSize[cameraCount][0];
    var width = $('#full-cameras-container').width() - 150;
    var height = $('#full-cameras-container').height();
    var scale = Math.min(width / totalSize[0], height / totalSize[1]);
    var cameraSize = fullscreenCameraSize[cameraCount][1];
    $('.camera-item:not(.d-none)').each(function (idx) {
      $(this).find('.camera-container').css({
        width: cameraSize[0] * scale,
        height: cameraSize[1] * scale
      }).find('video').css({
        width: cameraSize[0] * scale,
        height: cameraSize[1] * scale
      });
      if (cameraCount < 4 || idx < cameraCount / 2) {
        $('#full-cameras-container .d-flex:eq(0)').append($(this));
      } else {
        $('#full-cameras-container .d-flex:eq(1)').append($(this));
      }
    });
  } else {
    $('.camera-container').css({
      width: cameraContainerWidth,
      height: cameraContainerWidth
    }).find('video').css({
      width: cameraWidth,
      height: cameraHeight
    });
    $('.camera-item').appendTo('#cameras-container');
  }
}

var setVolume = function (playerId, distance, total) {
  var aid = $(`#${playerId} audio`)[0];
  if (!aid) return
  if (distance < total / 9.75) {
    aid.volume = 1
  } else if (distance < total / 5) {
    aid.volume = 0.75;
  } else if (distance < total / 3.5) {
    aid.volume = 0.5;
  } else if (distance < total / 2) {
    aid.volume = 0.25;
  } else {
    aid.volume = 0.075;
  }
}

var goHomeToplaza = function () {
  if (personData.guest) {
    $('#warning-guest-mode').modal('show');
    return;
  }

  sendMessage({
    type: 'update-position',
    data: {
      posX: (homeToPlazaDoorPosX + homeToPlazaDoorWidth / 2) / scale,
      posY: (homeToPlazaDoorPosY + homeToPlazaDoorHeight * 0.6) / scale,
      goHomeToPlaza: true,
    }
  });
}

var goPlazaToHome = function () {
  sendMessage({
    type: 'update-position',
    data: {
      posX: (plazaToHomeDoorPosX + plazaToHomeDoorWidth / 2) / scale,
      posY: (plazaToHomeDoorPosY + plazaToHomeDoorHeight * 0.6) / scale,
      goPlazaToHome: true,
    }
  });
}

var goPlazaToCoffeeShop = function () {
  sendMessage({
    type: 'update-position',
    data: {
      posX: (plazaToShopDoorPosX + plazaToShopDoorWidth / 2) / scale,
      posY: (plazaToShopDoorPosY + plazaToShopDoorHeight * 0.6) / scale,
      goPlazaToCoffeeShop: true,
    }
  });
}

var goCoffeeShopToPlaza = function () {
  sendMessage({
    type: 'update-position',
    data: {
      posX: (shopToPlazaDoorPosX + shopToPlazaDoorWidth / 2) / scale,
      posY: (shopToPlazaDoorPosY + shopToPlazaDoorHeight * 0.6) / scale,
      goCoffeeShopToPlaza: true,
    }
  });
}

var goPlazaToPizza = function () {
  sendMessage({
    type: 'update-position',
    data: {
      posX: (plazaToPizzaDoorPosX + plazaToPizzaDoorWidth / 2) / scale,
      posY: (plazaToPizzaDoorPosY + plazaToPizzaDoorHeight * 0.6) / scale,
      goPlazaToPizza: true
    }
  });
}

var goPizzaToPlaza = function () {
  sendMessage({
    type: 'update-position',
    data: {
      posX: 115,
      posY: 650,
      goPizzaToPlaza: true
    }
  });
}

var sitDown = function (tableId, pos) {
  var seat = seatList[tableId][pos];
  if (seat.empty) {
    mixpanel.track('Sit Down', {
      'ownId': ownId,
      'tableId': tableId,
      'seatNum': pos
    });

    tweens[ownId] && tweens[ownId].remove();
    sendMessage({
      type: 'sit-down',
      data: {
        tableId,
        pos
      }
    });
  }
}

// Check current opening modal
$('.modal').on('show.bs.modal', function () {
  $openModal = $('.modal:visible');
  if ($openModal.length && $openModal.attr('id') == 'welcome-guide-modal') {
    $(this).data('bs.modal', '');
    // $.notify("You can't do this action", {
    //   type: 'danger',
    // });
    return false;
  }

  if ($openModal.length && $openModal.attr('id') == 'play-game-modal') {
    $('#reject-play-game').click();
  }
  $openModal.modal('hide');
});

function logout() {
  if (socket) {
    socket.close();
  }
  Cookies.set('swiddle_token', false, { expires: -1 });
  Cookies.set('swiddle_email', false, { expires: -1 });
  // sessionStorage.setItem('loggedIn', '');
  window.location.href = '/sign-in';
}

// Resize window event
$(window).on('resize', function () {
  var currentBodyWidth = $('body').width();
  var rate = currentBodyWidth / bodyWidth;
  cameraContainerWidth = Math.floor(currentBodyWidth / 10);
  cameraWidth = cameraContainerWidth / 16 * 21;
  cameraHeight = cameraContainerWidth / 32 * 31

  $('.camera-container').css({
    width: parseFloat($('.camera-container').css('width')) * rate,
    height: parseFloat($('.camera-container').css('height')) * rate
  }).find('video').css({
    width: parseFloat($('.camera-container video').css('width')) * rate,
    height: parseFloat($('.camera-container video').css('height')) * rate,
  });

  if (rate && $('.circle_animation').length) {
    $('.circle_animation').attr({
      r: parseFloat($('.circle_animation').attr('r')) * rate,
      cx: parseFloat($('.circle_animation').attr('cx')) * rate,
      cy: parseFloat($('.circle_animation').attr('cy')) * rate,
    }).parent('svg').attr({
      width: parseFloat($('.circle_animation').parent('svg').attr('width')) * rate,
      height: parseFloat($('.circle_animation').parent('svg').attr('height')) * rate
    });
  }

  bodyWidth = currentBodyWidth;
});