var pathGridSize = 24; // 48 x 48
var pathGridX = 80;
var pathGridY = 38;
var pathGrid = [];
var easystar = new EasyStar.js();

easystar.enableDiagonals();

function setGrid() {
  for (i = 0; i < pathGridY; i++) {
    pathGrid.push([]);
    for (j = 0; j < pathGridX; j++) {
      pathGrid[i][j] = 0;
    }
  }
  for (inventoryId in inventoryObjects) {
    var inventoryData = inventoryObjects[inventoryId];
    var inventoryName = inventoryData.name;
    var inventoryType = furnitureList[item].type;
    if (inventoryType == 'door' || inventoryType != 'chair' && nonInteratives.includes(inventoryName)) {
      continue;
    }
    for (x = Math.round((inventoryData.x - pathGridSize / 2) / pathGridSize); x < Math.round((inventoryData.x - pathGridSize / 2 + inventoryData.width) / pathGridSize); x++) {
      for (y = Math.round((inventoryData.y - pathGridSize / 2) / pathGridSize); y < Math.round((inventoryData.y - pathGridSize / 2 + inventoryData.height) / pathGridSize); y++) {
        if (x >= pathGridX || y >= pathGridY) {
          continue;
        }
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        pathGrid[y][x] = inventoryData.name == 'diningtable' ? 1 : 2;
      }
    }
  }
  easystar.setGrid(pathGrid);
}

function updatePosition(data, hadSeat) {
  // stop before tween
  if (tweens[data.id]) {
    tweens[data.id].remove();
  }

  moveSteps[data.id] = 0;
  var avatar = containerList[data.id];
  var distance = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, data.posX, data.posY));

  if (sceneName == 'home' && distance >= pathGridSize) {
    if (hadSeat) {
      easystar.setAcceptableTiles([0, 1]);
    } else {
      easystar.setAcceptableTiles([0]);
    }
    var sX = avatar.x;
    var sY = avatar.y;
    easystar.findPath(Math.floor(sX / pathGridSize), Math.floor(sY / pathGridSize), Math.floor(data.posX / pathGridSize), Math.floor(data.posY / pathGridSize), function (path) {
      if (path === null) {
        return;
      }
      path.map(function (pt) {
        pt.x *= pathGridSize * scale;
        pt.y *= pathGridSize * scale;
        // pt.x += pathGridSize / 2;
      });
      path.shift();
      path.shift();
      path.unshift({x: sX, y: sY});
      path.pop();
      path.pop();
      path.push({x: data.posX, y: data.posY});
      // var curve = new Phaser.Curves.Spline(path);
      // var phaserPath = new Phaser.Curves.Path();
      // phaserPath.add(curve);
      distance = 0;
      var phaserPath = new Phaser.Curves.Path(path[0].x, path[0].y);
      for (i=1; i<path.length; i++) {
        distance += Phaser.Math.Distance.Between(path[i].x, path[i].y, path[i-1].x, path[i-1].y);
        phaserPath.lineTo(path[i].x, path[i].y);
      }
      avatar.pathFollower = scene.plugins.get('rexpathfollowerplugin').add(avatar, {
        path: phaserPath,
        t: 0,
      });
      tweens[data.id] = scene.tweens.add({
        targets: avatar.pathFollower,
        t: 1,
        ease: 'Linear', // 'Cubic', 'Elastic', 'Bounce', 'Back'
        depth: data.posY,
        step: { from: 0, to: distance / moveSpeed / 200 },
        duration: distance / moveSpeed,
        onUpdate: function (tween) {
          const currentStep = Math.floor(tween.data[2].current);
          if (moveSteps[data.id] < currentStep) {
            moveSteps[data.id] = currentStep;

            if (videoEllipses[data.id]) {
              videoEllipses[data.id].setPosition(avatar.x, avatar.y);
            } else {
              videoEllipses[data.id] = new Phaser.Geom.Ellipse(avatar.x, avatar.y, movingCmtEllipseWidth, movingCmtEllipseHeight);
            }

            if (data.id === ownId) {
              for (data.id in videoEllipses) {
                if (data.id === ownId) continue;

                var roomName = data.id + '/' + ownId;
                if (ownId > data.id) {
                  roomName = ownId + '/' + data.id;
                }
                if (sceneName == 'home') {
                  if (!Number.isInteger(seatStates[data.id]) && videoEllipses[ownId].contains(containerList[data.id].x, containerList[data.id].y)) {
                    connectVideoRoom(roomName);
                    var dist = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, containerList[ownId].x, containerList[ownId].y));
                    setVolume(data.id, dist, movingCmtEllipseWidth / 2);
                  } else {
                    disconnectVideoRoom(roomName);
                  }
                }
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
            sendMessage({
              type: 'updated-position',
              data: {
                posX: data.posX / scale,
                posY: data.posY / scale,
              }
            });
            for (data.id in videoEllipses) {
              if (data.id === ownId) {
                continue;
              }

              var roomName = data.id + '/' + ownId;
              if (ownId > data.id) {
                roomName = ownId + '/' + data.id;
              }
              if (sceneName == 'home') {
                if (!Number.isInteger(seatStates[data.id]) && videoEllipses[ownId].contains(containerList[data.id].x, containerList[data.id].y)) {
                  connectVideoRoom(roomName);
                  var dist = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, containerList[ownId].x, containerList[ownId].y));
                  setVolume(data.id, dist, movingCmtEllipseWidth / 2);
                } else {
                  disconnectVideoRoom(roomName);
                }
              }
            }

            if (sceneName === 'home' && data.goHomeToPlaza) {
              sendMessage({ type: 'home-to-plaza' });
            } else if (sceneName === 'plaza' && data.goPlazaToHome) {
              sendMessage({ type: 'plaza-to-home' });
            } else if (sceneName === 'plaza' && data.goPlazaToCoffeeShop) {
              sendMessage({ type: 'plaza-to-shop' });
            } else if (sceneName === 'shop' && data.goCoffeeShopToPlaza) {
              sendMessage({ type: 'shop-to-plaza' });
            } else if (sceneName === 'plaza' && data.goPlazaToPizza) {
              sendMessage({ type: 'plaza-to-pizza' });
            } else if (sceneName === 'pizza' && data.goPizzaToPlaza) {
              sendMessage({ type: 'pizza-to-plaza' });
            }
          } else {
            var roomName = data.id + '/' + ownId;
            if (ownId > data.id) {
              roomName = ownId + '/' + data.id;
            }
            if (sceneName == 'home') {
              if (videoEllipses[data.id].contains(containerList[ownId].x, containerList[ownId].y)) {
                connectVideoRoom(roomName);
                var dist = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, containerList[ownId].x, containerList[ownId].y));
                setVolume(data.id, dist, movingCmtEllipseWidth / 2);
              } else {
                disconnectVideoRoom(roomName);
              }
            }
          }
        }
      });
    });
    easystar.calculate();
  } else {
    tweens[data.id] = scene.tweens.add({
      targets: containerList[data.id],
      x: data.posX,
      y: data.posY,
      depth: data.posY,
      step: { from: 0, to: distance / moveSpeed / 200 },
      duration: distance / moveSpeed,
      onUpdate: function (tween) {
        const currentStep = Math.floor(tween.data[3].current);
        if (moveSteps[data.id] < currentStep) {
          moveSteps[data.id] = currentStep;

          if (videoEllipses[data.id]) {
            videoEllipses[data.id].setPosition(avatar.x, avatar.y);
          } else {
            videoEllipses[data.id] = new Phaser.Geom.Ellipse(avatar.x, avatar.y, movingCmtEllipseWidth, movingCmtEllipseHeight);
          }

          if (data.id === ownId) {
            for (data.id in videoEllipses) {
              if (data.id === ownId) continue;

              var roomName = data.id + '/' + ownId;
              if (ownId > data.id) {
                roomName = ownId + '/' + data.id;
              }
              if (sceneName == 'home') {
                if (!Number.isInteger(seatStates[data.id]) && videoEllipses[ownId].contains(containerList[data.id].x, containerList[data.id].y)) {
                  connectVideoRoom(roomName);
                  var dist = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, containerList[ownId].x, containerList[ownId].y));
                  setVolume(data.id, dist, movingCmtEllipseWidth / 2);
                } else {
                  disconnectVideoRoom(roomName);
                }
              }
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
          sendMessage({
            type: 'updated-position',
            data: {
              posX: data.posX / scale,
              posY: data.posY / scale,
            }
          });
          for (data.id in videoEllipses) {
            if (data.id === ownId) {
              continue;
            }

            var roomName = data.id + '/' + ownId;
            if (ownId > data.id) {
              roomName = ownId + '/' + data.id;
            }
            if (sceneName == 'home') {
              if (!Number.isInteger(seatStates[data.id]) && videoEllipses[ownId].contains(containerList[data.id].x, containerList[data.id].y)) {
                connectVideoRoom(roomName);
                var dist = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, containerList[ownId].x, containerList[ownId].y));
                setVolume(data.id, dist, movingCmtEllipseWidth / 2);
              } else {
                disconnectVideoRoom(roomName);
              }
            }
          }

          if (sceneName === 'home' && data.goHomeToPlaza) {
            sendMessage({ type: 'home-to-plaza' });
          } else if (sceneName === 'plaza' && data.goPlazaToHome) {
            sendMessage({ type: 'plaza-to-home' });
          } else if (sceneName === 'plaza' && data.goPlazaToCoffeeShop) {
            sendMessage({ type: 'plaza-to-shop' });
          } else if (sceneName === 'shop' && data.goCoffeeShopToPlaza) {
            sendMessage({ type: 'shop-to-plaza' });
          } else if (sceneName === 'plaza' && data.goPlazaToPizza) {
            sendMessage({ type: 'plaza-to-pizza' });
          } else if (sceneName === 'pizza' && data.goPizzaToPlaza) {
            sendMessage({ type: 'pizza-to-plaza' });
          }
        } else {
          var roomName = data.id + '/' + ownId;
          if (ownId > data.id) {
            roomName = ownId + '/' + data.id;
          }
          if (sceneName == 'home') {
            if (videoEllipses[data.id].contains(containerList[ownId].x, containerList[ownId].y)) {
              connectVideoRoom(roomName);
              var dist = parseInt(Phaser.Math.Distance.Between(containerList[data.id].x, containerList[data.id].y, containerList[ownId].x, containerList[ownId].y));
              setVolume(data.id, dist, movingCmtEllipseWidth / 2);
            } else {
              disconnectVideoRoom(roomName);
            }
          }
        }
      }
    });
  }
}

function goToSitDown(data, hadSeat) {
  // stop before tween
  if (tweens[data.id]) {
    tweens[data.id].remove();
  }

  var seat = seatList[data.pos];
  var avatar = containerList[data.id];
  var distance = parseInt(Phaser.Math.Distance.Between(avatar.x, avatar.y, seat.posX, seat.posY));

  // if (!hadSeat && sceneName == 'home' && distance >= pathGridSize) {
  //   easystar.setAcceptableTiles([0, 1]);
  //   var sX = avatar.x;
  //   var sY = avatar.y;
  //   easystar.findPath(Math.floor(sX / pathGridSize), Math.floor(sY / pathGridSize), Math.floor(seat.posX / pathGridSize), Math.floor(seat.posY / pathGridSize), function (path) {
  //     if (path === null) {
  //       return;
  //     }
  //     path.map(function (pt) {
  //       pt.x *= pathGridSize * scale;
  //       pt.y *= pathGridSize * scale;
  //     });
  //     path.shift();
  //     path.shift();
  //     path.unshift({x: sX, y: sY});
  //     path.pop();
  //     path.pop();
  //     path.push({x: seat.posX, y: seat.posY});
  //     distance = 0;
  //     var phaserPath = new Phaser.Curves.Path(path[0].x, path[0].y);
  //     for (i=1; i<path.length; i++) {
  //       distance += Phaser.Math.Distance.Between(path[i].x, path[i].y, path[i-1].x, path[i-1].y);
  //       phaserPath.lineTo(path[i].x, path[i].y);
  //     }
  //     avatar.pathFollower = scene.plugins.get('rexpathfollowerplugin').add(avatar, {
  //       path: phaserPath,
  //       t: 0,
  //     });
  //     tweens[data.id] = scene.tweens.add({
  //       targets: avatar.pathFollower,
  //       t: 1,
  //       ease: 'Linear', // 'Cubic', 'Elastic', 'Bounce', 'Back'
  //       depth: data.posY,
  //       step: { from: 0, to: distance / moveSpeed / 200 },
  //       duration: distance / moveSpeed,
  //       onComplete: function () {
  //         var avatar = avatar.getAt(0);
  //         avatar.setCrop(0, 0, avatar.width, avatar.height / 2);

  //         if (data.id === ownId) {
  //           $('#message-box-container').removeClass('d-flex').addClass('d-none');
  //           $('#choose-game-container').removeClass('d-none').addClass('d-flex');
  //         }
  //       }
  //     });
  //   });
  //   easystar.calculate();
  // } else {
    tweens[data.id] = scene.tweens.add({
      targets: avatar,
      x: seat.posX,
      y: seat.posY,
      depth: seat.posY,
      duration: distance / moveSpeed,
      onComplete: function () {
        var avatarImg = avatar.getAt(0);
        avatarImg.setCrop(0, 0, avatarImg.width, avatarImg.height / 2);

        if (data.id === ownId) {
          $('#message-box-container').removeClass('d-flex').addClass('d-none');
          $('#choose-game-container').removeClass('d-none').addClass('d-flex');
        }
      }
    });
  // }
}