var airhockeyCanvas;
var ctx;
var airHockeyNotification;

// The offscreen airhockeyCanvas, for buffering image data
var bufferCanvas;
var bufferCtx;

var side = {		// which side the player will be on - left (0) or right (1)
  is: 0
}
var user = {	// info about the user
  username: "",
  pos: {
    x: 0,
    y: 0
  },
  points: 0,
  img: new Image()
};
var otherUser = { // info about the other enemy user
  username: "",
  pos: {
    x: -64,
    y: -64
  },
  points: 0,
  img: new Image(),
  lastTime: new Date().getTime()
};
var puck = { // info about the puck
  pos: {
    x: 320,
    y: 200 
  },
  vel: {
    x: 0,
    y: 0
  },
  img: new Image(),
  radius: 25,
  lastTime: new Date().getTime()
};
initGameBoard();

function initAirHockeyGame() {
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
    $(this).appendTo('#air-hockey-cameras-container');
  });

  $('#air-hockey-cameras-container .camera-container').css({
    width: cameraContainerWidth * cameraScale,
    height: cameraContainerWidth * cameraScale,
  }).find('video').css({
    width: cameraWidth * cameraScale,
    height: cameraHeight * cameraScale
  });
  $('#air-hockey-game-scene').show();
}

var airHockeyEndGame = function () {
  // Close air-hockey game
  $('#air-hockey-iframe').attr('src', 'about:blank');

  $('.camera-container').css({
    width: cameraContainerWidth,
    height: cameraContainerWidth
  }).find('video').css({
    width: cameraWidth,
    height: cameraHeight
  });
  $('.camera-item').appendTo('#cameras-container');
  $('#cameras-container').show();
  $('#air-hockey-game-scene').hide();
  $('#continue-game-panel').removeClass('d-flex');
}

function initAirHockeyInventory(inventoryId) {
  const airHockey = inventoryObjects[inventoryId];
  airHockey.on('pointerdown', function (pointer, _x, _y, event) {
    if ($(pointer.downElement).parent().attr('id') != 'container') {
      return;
    }
    event.stopPropagation();
    // Check if click left button
    if (pointer.button != 0) {
      $('#go-to-another-scene').siblings('.popup-menu').css({ 'top': pointer.event.y, 'left': pointer.event.x });
      $('#go-to-another-scene').dropdown('show');
      $('#move-to-scene').text('Join Air Hockey').off().click(function () {
        goToAirHockeyTable(airHockey.x, airHockey.y);
      });
      return;
    }

    goToAirHockeyTable(airHockey.x, airHockey.y);
  });
}

function goToAirHockeyTable(x, y) {
  sendMessage({
    type: 'update-position',
    data: {
      posX: (x + 30) / scale,
      posY: (y + 50) / scale,
      airHockey: true
    }
  });
}

function initGameBoard() {
  // grab the airhockeyCanvas and its context
  airhockeyCanvas = document.getElementById('air-hockey-canvas');
  ctx = airhockeyCanvas.getContext('2d');
  
  // create the offscreen buffer airhockeyCanvas and grab its context
  bufferCanvas = document.createElement('canvas');
  bufferCtx = bufferCanvas.getContext('2d');

  // get airhockeyCanvas mouseover callbacks to update paddle position
  document.addEventListener('mousemove', function(e) {
    var canvasPos = airhockeyCanvas.getBoundingClientRect();
    user.pos.x = clamp(e.x - canvasPos.left, (side.is*airhockeyCanvas.width/2) + user.img.width/2, (side.is*airhockeyCanvas.width/2)+airhockeyCanvas.width/2-user.img.width/2);
    user.pos.y = clamp(e.y - canvasPos.top, user.img.width/2, airhockeyCanvas.height-user.img.height/2);
  });
  
  // load paddle and puck icons from the server
  user.img.src = "/images/air-hockey/userPaddle.png";
  otherUser.img.src = "/images/air-hockey/enemyPaddle.png";
  puck.img.src = "/images/air-hockey/puck.png";
  
  // setup airhockeyCanvas for drawing text
  ctx.font = "14pt 'Roboto'";
}

// The main draw and update loop, which is started once a game begins
function updateAirHockeyBoard() {
  ctx.clearRect(0, 0, airhockeyCanvas.width, airhockeyCanvas.height);
  
  // update puck position
  puck.pos.x += puck.vel.x;
  puck.pos.y += puck.vel.y;
  
  // Client will simulate puck physics here in case of some server disconnect
  // attemp to bounce the puck off walls
  bouncePuck();
  
  // apply friction to the puck
  puck.vel.x *= 0.9975;
  puck.vel.y *= 0.9975;
  
  // draw the three game elements
  ctx.drawImage(puck.img, puck.pos.x - puck.img.width/2, puck.pos.y - puck.img.height/2);
  ctx.drawImage(user.img, user.pos.x - user.img.width/2, user.pos.y - user.img.height/2);
  ctx.drawImage(otherUser.img, otherUser.pos.x - otherUser.img.width/2, otherUser.pos.y - otherUser.img.height/2);
  
  // draw the scores in the corners
  ctx.save();
    // draw the scores on the correct side depending on which side we're playing on
    if (side.is === 0) {
      ctx.fillText(user.username + ": " + user.points, 5, 25);
      ctx.textAlign = "end";
      ctx.fillText(otherUser.points + " :" + otherUser.username, airhockeyCanvas.width - 5, 25);
    }
    else {
      ctx.fillText(otherUser.username + ": " + otherUser.points, 5, 25);
      ctx.textAlign = "end";
      ctx.fillText(user.points + " :" + user.username, airhockeyCanvas.width - 5, 25);
    }
  ctx.restore();
  
  // emit our position to the other user
  socket.emit("air-hockey-info", {pos: user.pos})
  
  // draw the current notification from the server
  if (airHockeyNotification != "") {
    ctx.save();
      ctx.font = "36pt Roboto";
      ctx.textAlign = "center"
      ctx.textBaseline = "middle";
      ctx.fillText(airHockeyNotification, airhockeyCanvas.width/2, airhockeyCanvas.height/3);
    ctx.restore();
  }
  
  // request next frame
  requestAnimationFrame(updateAirHockeyBoard);
}

/* bouncePuck
  checks the puck's position and bounces it off the walls
*/
function bouncePuck() {
  // bounce left-right
  if ((puck.pos.x - puck.radius < 0) || (puck.pos.x + puck.radius > airhockeyCanvas.width)) {
    puck.vel.x *= -1;
  }
  
  // bounce up-down
  if ((puck.pos.y - puck.radius < 0) || (puck.pos.y + puck.radius > airhockeyCanvas.height)) {
    puck.vel.y *= -1;
  }
}
			
// A helper function for updating positions
// Returns value clamped within min and max
function clamp(val, min, max) {
  return Math.max(min, Math.min(val, max));
}

function airHockeyInfo(data) {
  // GameManager tells us which object it's updating in data.object
  switch (data.object) {
    // add all the sent keys to our userdata
    case "user":
      console.log("air-hockey-info", data);
      if (data.pos) {
        user.pos = data.pos;
      }
      if (data.side) {
        side.is = data.side;
        Object.freeze(side);
      }
      if (data.username) {
        user.username = data.username;
      }
      break;
    case "otherUser":
      console.log("air-hockey-info", data);
      // only update other user if the new data is more recent
      if (data.time > otherUser.lastTime) {
        if (data.pos) {
          otherUser.pos = data.pos;
        }
        if (data.username) {
          otherUser.username = data.username;
        }
        
        // update their last updated time to this packet's time
        otherUser.lastTime = data.time;
      }
      break;
    case "puck":
      // only update puck if the new data is more recent
      if (data.time > puck.lastTime) {
        puck.pos = data.pos;
        puck.vel = data.vel;
        
        // update the puck's updated time to this packet's time
        puck.lastTime = data.time;
      }
      break;
  }
}

function airHockeyNotify(data) {
  // update the global notification
  airHockeyNotification = data.msg;
					
  // if the server sends a <= 0 duration, it's permanent
  if (data.duration > 0) {
    // reset the notification after the duration ends
    setTimeout(function(currentNotif) {
      // delete the notification if it hasn't been overwritten
      if (airHockeyNotification === data.msg) {
        airHockeyNotification = "";
      }
      
    }, data.duration);
  }
}

function airHockeyScore(data) {
  if (data.side === side.is) {
    ++otherUser.points;
  }
  // not scored in our goal - we must have scored it
  else {
    ++user.points;
  }
}