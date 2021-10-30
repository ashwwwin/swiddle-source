var coins = sessionStorage.getItem('coins');

var earnedCoin = function (data) {
  $.notify(`You earned ${data.add} coins`);
  $('#coins').text(data.total);

  coins = data.total;
  userInfo.coins = data.total;
}