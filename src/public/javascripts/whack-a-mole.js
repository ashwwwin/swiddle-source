const holes = $(".hole");
const whackScoreBoard = $(".whack-core");
const moles = $(".mole");
let lastHole;
let timeUp = false;
let whackScore = 0;

function randomTime(min, max) {
  // Let's create the random amount of time the mole shows up
  return Math.round(Math.random() * (max - min) + min);
}

function randomHole(holes) {
  const idx = Math.floor(Math.random() * holes.length);
  const hole = holes[idx];
  if (hole === lastHole) {
    //if the same hole appears twice one after another, we want to avoid that
    return randomHole(holes);
  }
  lastHole = hole;
  return hole;
}

function peep() {
  const time = randomTime(350, 600);
  const hole = randomHole(holes);
  hole.classList.add("up");
  setTimeout(() => {
    if (!timeUp) peep();
    hole.classList.remove("up");
  }, time); //after the time is up we want the moles to disappear and remove the class
}

function bunk(e) {
  if (!e.isTrusted) return; // close out the fake clicks during the game
  whackScore++;
  this.classList.remove("up");
  whackScoreBoard.text(whackScore);
}

moles.each(function() {
  this.addEventListener("click", bunk);
});

function startWhackGame() {
  whackScoreBoard.text(0);
  whackScore = 0;
  timeUp = false;
  peep();
  setTimeout(() => {
    timeUp = true;
  }, 10000);
}

function initWhackAMoleInventory(inventoryId) {
  const whackAMole = inventoryObjects[inventoryId];
  whackAMole.on('pointerdown', function (pointer, _x, _y, event) {
    if ($(pointer.downElement).parent().attr('id') != 'container') {
      return;
    }
    event.stopPropagation();
    // Check if click left button
    if (pointer.button != 0) {
      $('#go-to-another-scene').siblings('.popup-menu').css({ 'top': pointer.event.y, 'left': pointer.event.x });
      $('#go-to-another-scene').dropdown('show');
      $('#move-to-scene').text('Play Whack A Mole').off().click(function () {
        goToWhackAMoleTable(whackAMole.x + whackAMole.width / 2 - 30, whackAMole.y + whackAMole.height / 2);
      });
      return;
    }

    goToWhackAMoleTable(whackAMole.x + whackAMole.width / 2 - 30, whackAMole.y + whackAMole.height / 2);
  });
}

function goToWhackAMoleTable(x, y) {
  sendMessage({
    type: 'update-position',
    data: {
      posX: x / scale,
      posY: y / scale,
      whackAMole: true
    }
  });
}