var inventories = {};
var inventoryObjects = {};
var dragStart = false;
var trashBox;
var trashBoxWidth = 70;
var furnitureShopButton;
var furnitureShopButtonWidth = 100;
var depthList = {
  woodpanel: 1,
  tv: 2,
  shelfsmall: 2,
  rugblue: 0.1,
  diningtable: 1,
  window: 2,
  door: 1,
  fireplace: 1,
};
var nonInteratives = [
  'rugblue',
  'diningtable'
];

var selectedFurnitureName;
var ownFurnitureList = {};
var remainingFurnitures = {};
var furnitureCollisions = {};
var diningtableCollision;

var goToEventsWidth = 44;
var goToEvents;
var goToDesignWidth = 44;
var goToDesign;
var roomSetting;
roomSettingWidth = 47;

function initInventoryScene() {
  $('#inventory-box').load('/inventory-box', function () {
    $('#inventory-box .inventory-item').draggable({
      helper: 'clone',
      cursor: 'pointer',

      start: function (e, ui) {
        $(ui.helper).addClass('ui-draggable-helper');
        $(ui.helper).width($(ui.helper).width() * scale);
      },
      drag: function (event, ui) {
      },
      stop: function (event, ui) {
        var headerHeight = 61.6;
        useInventoryItem(ui.offset.left, ui.offset.top - headerHeight, $(this).data('inventory'))
      },
      disabled: true
    }).parents('.item-container').hide();

    generateInventories();
  });

  $('#furniture-shop').load('/furniture-shop', function () {
  });
}

function createNewInventory(posX, posY, item) {
  var inventoryId = generateRandomString(12);
  var worldPos = scene.cameras.main.getWorldPoint(posX, posY);

  createInventoryObject(inventoryId, worldPos.x, worldPos.y, item);

  inventories[inventoryId] = {
    name: item,
    x: worldPos.x / scale,
    y: worldPos.y / scale
  };
}

function createInventoryObject(inventoryId, x, y, item) {
  var inventory = scene.add.image(x, y, item);
  inventory.setScale(scale).setOrigin(0, 0);
  if (depthList[item]) {
    inventory.setDepth(depthList[item]);
  } else {
    inventory.setDepth(y > 3 ? y : 3);
  }
  inventory.id = inventoryId;
  inventory.name = item;
  if (inventories[inventoryId]) {
    inventory.flipX = !!inventories[inventoryId].flipX;
  }
  inventoryObjects[inventoryId] = inventory;

  if (sceneName == 'home-design') {
    inventory.setInteractive({
      draggable: true,
      useHandCursor: true,
      pixelPerfect: true
    }).on('dragstart', function (pointer, dragX, dragY) {
      if ($(pointer.downElement).parent().attr('id') != 'container') {
        return;
      }
      inventory.setAlpha(0.75);
      dragStart = true;
    }).on('drag', function (pointer, dragX, dragY) {
      if (!dragStart) {
        return;
      }
      inventory.setPosition(dragX, dragY);
    }).on('dragend', function (pointer, dragX, dragY, dropped) {
      if (!dragStart) {
        return;
      }
      if (dropped) {
        inventory.destroy();

        var inventoryName = inventories[inventory.id].name;
        addInventoryItem(inventoryName);

        delete inventories[inventory.id];
        delete inventoryObjects[inventory.id];
        trashBox.setTexture('box');
      } else {
        inventory.setAlpha(1);
        inventories[inventory.id].x = inventory.x / scale;
        inventories[inventory.id].y = inventory.y / scale;
        if (depthList[item]) {
          inventory.setDepth(depthList[item]);
        } else {
          inventory.setDepth(inventory.y > 3 ? inventory.y : 3);
        }
      }
      dragStart = false;
    }).on('dragenter', function (pointer, dropzone) {
      dropzone.setTexture('open-box');
    }).on('dragleave', function (pointer, dropzone) {
      dropzone.setTexture('box');
    }).on('pointerdown', function (pointer) {
      if (pointer.button == 2) {
        inventories[inventoryId].flipX = !inventories[inventoryId].flipX;
        inventory.flipX = inventories[inventoryId].flipX;
      }
    });
  } else if (!nonInteratives.includes(item)) {
    var inventoryType = furnitureList[item].type;
    if (inventoryType == 'door') {
      inventory.setInteractive({ useHandCursor: true });
      homeToPlazaDoorPosX = x;
      homeToPlazaDoorPosY = y;
      homeToPlazaDoorWidth = inventory.width * scale;
      homeToPlazaDoorHeight = inventory.height * scale;
      initHomeDoor(inventoryId);
    } else if (item == 'air-hockey') {
      inventory.setInteractive({ useHandCursor: true });
      initAirHockeyInventory(inventoryId);
    } else if (item == 'whack-a-mole_machine') {
      inventory.setInteractive({ useHandCursor: true });
      initWhackAMoleInventory(inventoryId);
    } else {
      furnitureCollisions[inventoryId] = new Phaser.Geom.Rectangle(x, y, inventory.width * scale, inventory.height * scale);
      inventory.setInteractive();
    }
  } else if (item == 'diningtable') {
    diningtableCollision = new Phaser.Geom.Rectangle(x, y, inventory.width * scale, inventory.height * scale);
  }
}

function generateInventories() {
  remainingFurnitures = Object.assign({}, ownFurnitureList);
  for (const inventoryId in inventories) {
    var inventoryData = inventories[inventoryId];
    // TODO: remove this in the future
    if (inventoryData.name == 'curtains') {
      inventoryData.name = 'window';
    }

    createInventoryObject(inventoryId, inventoryData.x * scale, inventoryData.y * scale, inventoryData.name);

    if (sceneName == 'home-design' && remainingFurnitures[inventoryData.name]) {
      remainingFurnitures[inventoryData.name]--;

      if (remainingFurnitures[inventoryData.name] <= 0) {
        delete remainingFurnitures[inventoryData.name]
      }
    }
  }

  if (sceneName == 'home-design') {
    for (const name in remainingFurnitures) {
      var $itemContainer = $(`#inventory-box [data-inventory=${name}]`).parents('.item-container');
      $itemContainer.find('.remaining-cnt').text(remainingFurnitures[name]);
      $itemContainer.find('.inventory-item').draggable({ disabled: false })
        .parents('.item-container')
        .show();
    }
  }
}

function generateSeats() {
  const seats = {};
  for (inventoryId in inventories) {
    var inventory = furnitureList[inventories[inventoryId].name];
    if (inventory.type == 'chair') {
      seats[inventoryId] = {
        seatWidth: inventory.seatWidth,
        chairHeight: inventory.chairHeight,
        deskHeight: inventory.deskHeight,
        count: inventory.count,
        firstPosX: inventories[inventoryId].x + inventory.firstPosX,
        firstPosY: inventories[inventoryId].y + inventory.firstPosY,
      };
      break;
    }
  }
  // if (diningtable) {
  //   for (let i = 0; i < 10; i++) {
  //     posList.push({ x: diningtable.x + 80 + seatWidth * i, y: diningtable.y + 80 })
  //   }
  // }

  return seats;
}

function initHomeDoor(inventoryId) {
  // Rect for doors and events
  homeToPlazaDoor = inventoryObjects[inventoryId];
  homeToPlazaDoor.removeInteractive().setInteractive({ useHandCursor: true });
  homeToPlazaDoor.on('pointerdown', function (pointer, _x, _y, event) {
    if ($(pointer.downElement).parent().attr('id') != 'container') {
      return;
    }
    event.stopPropagation();
    // Check if click left button
    if (pointer.button != 0) {
      $('#go-to-another-scene').siblings('.popup-menu').css({ 'top': pointer.event.y, 'left': pointer.event.x });
      $('#go-to-another-scene').dropdown('show');
      $('#move-to-scene').text('Go to Plaza').off().click(goHomeToplaza);
      return
    }

    goHomeToplaza();
  });
}

function initTrashBox() {
  // Trash box
  trashBox = scene.add.image(20, scene.cameras.main.height - 20, 'box').setScrollFactor(0);
  trashBox.setOrigin(0, 1).setScale(trashBoxWidth / trashBox.width).setDepth(1000).setVisible(false).setInteractive();
  trashBox.input.dropZone = true;
}

function initFurnitureShop() {
  furnitureShopButton = scene.add.image(scene.cameras.main.width - 30, scene.cameras.main.height - 90, 'shop-furniture').setScrollFactor(0);
  furnitureShopButton.setOrigin(1, 1).setScale(furnitureShopButtonWidth / furnitureShopButton.width).setDepth(1000).setVisible(false).setInteractive({ useHandCursor: true, pixelPerfect: true });
  // furnitureShopButton.on('pointerover', function () {
  //   furnitureShopButton.setTint(0xff0000);
  // }).on('pointerout', function () {
  //   furnitureShopButton.clearTint();
  // });
  furnitureShopButton.on('pointerdown', function () {
    $('#furniture-shop').fadeIn();
    $('#inventory-box').removeClass('show');
  });
}

//Security issue - I can run addInventoryItem('') with itemName and it adds to the users inventory
function addInventoryItem(inventoryName) {
  if (remainingFurnitures[inventoryName]) {
    remainingFurnitures[inventoryName]++;
  } else {
    remainingFurnitures[inventoryName] = 1;
  }
  var $itemContainer = $(`#inventory-box [data-inventory=${inventoryName}]`).parents('.item-container');
  $itemContainer.find('.remaining-cnt').text(remainingFurnitures[inventoryName]);
  $itemContainer.find('.inventory-item').draggable({ disabled: false })
    .parents('.item-container')
    .show();

  var furniture = furnitureList[inventoryName];
}

function useInventoryItem(x, y, inventoryName) {
  if (!remainingFurnitures[inventoryName]) {
    return;
  }
  remainingFurnitures[inventoryName]--;
  createNewInventory(x, y, inventoryName);
  var $itemContainer = $(`#inventory-box [data-inventory=${inventoryName}]`).parents('.item-container');
  $itemContainer.find('.remaining-cnt').text(remainingFurnitures[inventoryName]);
  if (remainingFurnitures[inventoryName] <= 0) {
    delete remainingFurnitures[inventoryName];
    $itemContainer.find('.inventory-item').draggable({ disabled: true })
      .parents('.item-container')
      .hide();
    $itemContainer.find('.remaining-cnt').text('');
  }
}

function checkFurnitureCollision(playerId, sitDown = false) {
  var playerAvatar = containerList[playerId].getAt(0);
  var avatarWidth = playerAvatar.displayWidth / 4;
  var avatarHeight = playerAvatar.displayHeight;
  var avatarCollision = new Phaser.Geom.Rectangle(containerList[playerId].x - avatarWidth / 2, containerList[playerId].y + avatarHeight * 3 / 8, avatarWidth, avatarHeight / 8);
  if (sitDown && Phaser.Geom.Rectangle.Overlaps(diningtableCollision, avatarCollision)) {
    return true;
  }
  for (inventoryId in furnitureCollisions) {
    var furniture = furnitureCollisions[inventoryId];
    if (Phaser.Geom.Rectangle.Overlaps(furniture, avatarCollision)) {
      return true;
    }
  }
  return false;
}

$('#show-inventory-box').click(function () {
  $('#inventory-box').addClass('show');
});

$('body').on('click', '#hide-inventory-box', function () {
  $('#inventory-box').removeClass('show');
});

$('body').on('click', '.save-inventory-box', function () {
  sendMessage({
    type: 'design-to-home',
    data: inventories
  });

  mixpanel.track('Home Design Saved', {
    'ownId': ownId
  });
});

$('body').on('click', '#cancel-home-design', function () {
  sendMessage({
    type: 'design-to-home',
  });
});

$('#furniture-shop').on('click', '#close-furniture-shop', function () {
  $('#furniture-shop').fadeOut();
  return false;
});

$('#furniture-shop').on('click', '.overlap', function () {
  $('#furniture-shop').fadeOut();
  return false;
});

$('#furniture-shop').on('click', '.item-container', function () {
  $img = $(this).find('img');
  $('#furniture-preview-img').attr('src', $img.attr('src'));
  selectedFurnitureName = $img.data('inventory');
  var furniture = furnitureList[selectedFurnitureName];
  var canBuy = (furniture.price <= coins);
  $('#furniture-preview-title').text(furniture.title);
  $('#furniture-preview-description').text(furniture.description);
  $('#furniture-preview-price').text(furniture.price + ' coins');

  if (canBuy) {
    $('#furniture-preview-price').removeClass('text-danger').addClass('text-success');
  } else {
    $('#furniture-preview-price').addClass('text-danger').removeClass('text-success');
  }

  $('#furniture-buy').removeClass('disabled');
  return false;
});

$('#furniture-shop').on('click', '#furniture-buy', function () {
  sendMessage({
    type: 'buy-furniture',
    data: selectedFurnitureName
  });
});

function purchaseItem(data) {
  if (data.success) {
    //Visually animate coins
    animateValue(coinsBalanceVisual, userInfo.coins, data.coins);

    //Storing new coins amount on client side
    coins = data.coins;
    userInfo.coins = coins;

    addInventoryItem(data.name);
    userInfo.coins = data.coins;

    //Notifies the user of a successful purchase
    $.notify((data.itemTitle + ' purchased'), {
      type: 'success'
    });
    
    updateCoins();
  } else {
    $.notify('Not enough coins for ' + (data.itemTitle), {
      type: 'danger'
    });
    coinsBalanceVisual.text(data.coins);
  }
}
