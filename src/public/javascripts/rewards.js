//Gets coin div
var coinsBalanceVisual = document.getElementById('coins');

//Checks with the backend when the user last claimed
function checkDailyReward() {
    if (userInfo.guideState == "finish") {
        sendMessage({
            type: 'check-daily-reward',
            data: ownId
        });
    }
}

//Opens the daily rewards page
function openDailyRewards() {
    $('#daily-rewards-welcome-text').text('Welcome back, ' +  ((userInfo?.name).split(" ", 1)) + ' 👋')
    $('#daily-rewards-modal').modal('show');
    return;
}

//Receives data from backend whether the user has claimed in the last 24 hrs, and opens the daily rewards page
function initDailyRewardCheck(validClaim) {
    if (validClaim) {
        openDailyRewards();
    }
}

//When the user presses on the gift
$('#claim-daily-reward').click(function () {
    sendMessage({
        type: 'claim-daily-reward',
        data: ownId
    });
})

function userDailyRewardGet(data) {
    //Sets box image to opacity 0.5, removes animation, and stops users from clicking it to show that it's open
    $('#claim-daily-reward').removeClass('dailyRewardsGiftAnimate');
    $('#claim-daily-reward').css('opacity', '0.5');
    $('#claim-daily-reward').css('pointer-events', 'none');

    //Checks if the claim is valid (gets data from backend)
    if (data.validClaim) {
        //Updates text to Checking
        $('#daily-rewards-instructions').text('Checking');
        $('#daily-rewards-instructions').css('color', '#00c200');


        var coinsWinNumVisual = document.getElementById('daily-rewards-win-number');
        $('#claim-gift-section').removeClass('d-none');

        //Visually animate coins
        animateValue(coinsWinNumVisual, 0, data.winAmount);
        animateValue(coinsBalanceVisual, userInfo.coins, data.totalCoins);
        
        var winTime = data.winAmount * 10;
        var balanceTime = data.totalCoins * 10;

        //Checks if the user has a multiplier
        if (data.multiplierAmount > 1) {
            //If their multiplier is 2 (max), then show a different message
            if (data.multiplierAmount == 2) {
                $('#daily-rewards-tommorrow-multiplier').text("Come back tomorrow to keep your 2x multiplier");
            } else {
                $('#daily-rewards-multiplier-number').text(data.multiplierAmount + "x");
            }
            
            //Timer to show multiplier animation (timed to start +0.5s after coins without multiplier animation)
            setTimeout(function() {
                mixpanel.track('Daily Reward', {
                    'ownId': ownId,
                    'winAmount': data.winAmount,
                    'multiplier': data.multiplierAmount,
                    'totalWin': data.totalWin,
                    'totalBalance': data.totalBalance
                  });


                //Shows multiplier amount
                $('#daily-rewards-multiplier-number').removeClass('d-none');
                $('#daily-rewards-multiplier-number').text(data.multiplierAmount + "x");

                //Start adding coins
                animateValue(coinsWinNumVisual, data.winAmount, data.totalWinAmount);

                //Timed to stop animation & update text when coin adding animation is done
                setTimeout(function() {
                    //Stops animation
                    $('#daily-rewards-multiplier-number').css('animation','none');

                    //Sets text to tell the user to come back tomorrow & congragulate them
                    $('#daily-rewards-instructions').text('Congratulations!');
                    $('#daily-rewards-tommorrow-multiplier').removeClass('d-none');
                }, winTime);
            }, balanceTime)
        } else {
            //If their multiplier == 1 (aka no multiplier)
            //Timer to update texts when coin adding animation is done (without multiplier animation)
            setTimeout(function() {
                //Sets text to tell the user to come back tomorrow & congragulate them
                $('#daily-rewards-tommorrow-multiplier').text(`Come back tomorrow for a ${data.tomorrowMultiplier}x multiplier`);
                $('#daily-rewards-tommorrow-multiplier').removeClass('d-none');
                $('#daily-rewards-instructions').text('Congratulations!');
            }, winTime);
        }
        //Storing new coins amount on client side
        userInfo.coins = data.totalCoins;
        coins = data.totalCoins;
    } else {
        $('#daily-rewards-instructions').text('Come back tomorrow for another reward');
        $('#daily-rewards-instructions').css('color', '#e80f00');
    }
}

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