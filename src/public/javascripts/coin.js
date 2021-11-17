//Animates the number going up/down
function animateValue(obj, start, end) {
  //Calculating the time from the amount of coins being changed (this allows consistent increases & decreases)
  var animateTime = Math.abs((end - start) * 10);

  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / animateTime, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

//Gets coin div
var coinsBalanceVisual = $('#coins');
var coins = sessionStorage.getItem('coins');

var earnedCoin = function (data) {
  $.notify(`You earned ${data.add} coins`);
  $('#coins').text(data.total);

  coins = data.total;
  userInfo.coins = data.total;
}

function updateCoins() {
  coins = userInfo.coins;
  coinsBalanceVisual.text(coins);
}
