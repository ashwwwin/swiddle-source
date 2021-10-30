//Checks the friends that users can send coins to & gifts received
function checkGifts() {
    //Gets the friends that the user can send coins to
    sendMessage({
        type: 'get-coin-send-ability',
        data: friendIds
    });

    //Gets the users received gifts
    sendMessage({
        type: 'get-coin-gifts',
        data: friendIds
    });
}

//Sending a gift to a friend
function sendGift(friend) {
    //Sends message to server
    sendMessage({
        type: 'send-coin-gift',
        data: friend
    });
}

//When user requests to claim the gift
function claimCoinGift(friend) {
    //Sends message to server
    sendMessage({
        type: 'claim-coin-gift',
        data: friend
    });
}



//Allows the user to claim a gift (visually)
function allowClaimGift(friends) {
    //Adds the user to the friend gifting page
    var counter = 0;

    if ((friends.friendGifts).length) {
        //Hides the no gifts text
        $('#no-receive-gifts-text').addClass('d-none');

        while (counter < (friends.friendGifts).length) {
            var friend = (friends.friendGifts)[counter];
            var friendName = (friends.friendNames)[counter];

            $('#receive-gifts-list').append(`
                <div id="friend-gift-from-${friend}" class="justify-content-between mb-2 mutual-friend-item d-flex" style="position: relative; width: 300px;">
                    <div class="d-flex align-items-center">
                        <img class="position-relative" style="left: 0; width: 35px;" src="/images/gift.png">
                        <span class="ml-2">From
                            <span class="player-name font-weight-bold" style="color: #000;">${friendName}</span>
                        </span>
                        <a id="claim-gift-btn-${friend}" class="btn font-weight-bold text-success" style="position: absolute; right: 0;" onclick="claimCoinGift('${friend}')"> Claim </a>
                    </div>
                </div>`);
            counter += 1;
        }
    }
}

//Updates the client with the gift the user has accepted
function addCoinGift(data) {
    //Changes the claim gift button 
    $('#claim-gift-btn-' + data.friendId).addClass('disabled').text(data.winAmount + ' coins').css('color', '#f5b642');

    //Updates the coin balance visually
    animateValue(coinsBalanceVisual, userInfo.coins, data.totalCoins);

    //Storing new coins amount on client side
    userInfo.coins = data.totalCoins;
    coins = data.totalCoins;
    
    mixpanel.track('Accept Gift', {
        'ownId': ownId
      });
}



//Shows which friends the user can send gifts to
function allowCoinGift(friends) {
    //Adds the user to the friend gifting page
    var counter = 0;

    if ((friends.friendGifts).length != 0) {
        //Hides the no send text
        $('#no-send-gifts-text').addClass('d-none');

        while (counter < (friends.friendGifts).length) {
            var friend = (friends.friendGifts)[counter];
            var friendName = (friends.friendNames)[counter];

            
            $('#send-gifts-list').append(`
                <div id="friend-gift-to-${friend}" class="justify-content-between mb-2 mutual-friend-item d-flex" style="position: relative; width: 300px;">
                    <div class="d-flex align-items-center">
                        <img class="position-relative" style="left: 0; width: 35px;" src="/images/gift.png">
                        <span class="ml-2">To
                            <span class="player-name font-weight-bold" style="color: #000;">${friendName}</span>
                        </span>
                        <a id="send-gift-btn-${friend}" class="btn font-weight-bold text-success" style="position: absolute; right: 0;" onclick="sendCoinGift('${friend}')"> Send </a>
                    </div>
                </div>`);
            counter += 1;
        }
    }
}

//Updates the client with the user that the gift has been sent to
function sendCoinGift(friend) {
    //Changes the sent button
    $('#send-gift-btn-' + friend).addClass('disabled').text('Gift sent').css('color', '#f5b642');

    //Sends request to server
    sendGift(friend);

    mixpanel.track('Send Gift', {
        'ownId': ownId,
        'friendId': friend
      });
}