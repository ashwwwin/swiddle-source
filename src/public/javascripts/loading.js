var loadingTimer;
var loadingValue;
var $loadingProgress = $('#loading-progress');
var $loadingScene = $('#loading-screen');
var messageTipsLoader = ["Invite friends home", "Leave no stone unturned", "Right click on a user to see their profile", "Earn coins by playing games outside", "Not quite my tempo", "It's kind of fun to do the impossible", "The best way to predict the future is to invent it", "Invite friends to earn 500 coins", "Come back daily for prizes"]

// $loadingScene.show();

window.addEventListener('load', function () {
  setTimeout(function (){
    $loadingScene.hide();
  }, 500);
});

function changeMsgTip() {
  $('#loadingMsgTips').text((messageTipsLoader[Math.floor(Math.random()*messageTipsLoader.length)]));
}

function startLoading() {
  $loadingScene.show();
}

function stopLoading() {
  setTimeout(function (){
    $loadingScene.hide();
  }, 3000);
}