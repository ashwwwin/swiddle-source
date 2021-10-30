var friendIds = [];
var selectedFriendId = null;
var selectedFriendId_storage = null;
var pendingRequestIds = [];
var friendListOpen = false;
var onlineFriends = [];
var msgEmailTimerRunning = false;
var msgEmailList = [];


//Emails users that are offline if they have received a message afte
function userOfflineMsgEmail(playerId) {
  //Adds user to the message list if not already there
  if (!msgEmailList.includes(playerId)) {
    msgEmailList.push(playerId);
  }
  //Checks if email timer is running
  if (!msgEmailTimerRunning) {
    //Sets time for emailing function
    setTimeout(
      function () {
        var emailCounter = 0;
        //Runs it for every user
        while (emailCounter < msgEmailList.length) {
          userId = msgEmailList[emailCounter];
          //Checks that the user is not currently online
          if (!onlineFriends.includes(userId)) {
            sendOfflineMsgEmail(userId);
          }
          emailCounter++;
        }
        //Resets the email list & timer
        msgEmailList = [];
        msgEmailTimerRunning = false;
      }, 50000);
    //Timer starts
    msgEmailTimerRunning = true;
  }
}

function sendOfflineMsgEmail(playerId) {
  $.ajax({
    url: '/msg-email',
    type: 'post',
    dataType: 'json',
    data: {
      senderId: ownId,
      receiverId: playerId
    }
  });

  mixpanel.track('Message Email Notification', {
    'ownId': ownId,
    'friendId': playerId
  });
}

//Adds users to online list
function onlineFriends_add(friendId) {
  //Checks if the user is not online, then add
  if (!onlineFriends.includes(friendId)) {
    onlineFriends.push(friendId);
  }
}

//Removes users from online list
function onlineFriends_remove(friendId) {
  //Checks if the user is online, then remove
  if (onlineFriends.includes(friendId)) {
    var index = onlineFriends.indexOf(friendId);
    if (index > -1) {
      onlineFriends.splice(index, 1);
    }
  }
}

//Makes sure the desktop badges are up to date, this can be used for in game message badges too
function badgeUpdate() {
  sendMessage({
    type: 'desktop-badge-update'
  });
}

//Runs badge update on page load
badgeUpdate();



//This fixes issues rising from closing chat, then opening it. 
//Chat stays connected & message reads get detected after closing then opening friend system (while maintaining user & scroll position)
function selectedFriendId_store() {
  if (selectedFriendId != null) {
    selectedFriendId_storage = selectedFriendId;
    selectedFriendId = null;
  }
}

function selectedFriendId_get() {
  if (selectedFriendId_storage != null) {
    //Sends id to main variable
    selectedFriendId = selectedFriendId_storage;
  }
}

//Friends list toggle
$('#friend-list').click(function () {
  if (friendListOpen == true) {
    //If it's open then close it
    $('#my-friends-container').removeClass('show');
    friendListOpen = false;
    selectedFriendId_store();

    //Shows messagebox
    messageBox.show();
  } else {
    //If it's closed open it
    $('#my-friends-container').addClass('show');
    friendListOpen = true;

    //Gets the stored id
    selectedFriendId_get();

    //Hides messagebox
    messageBox.hide();

    //Checks if selectedFriendId is filled
    if (selectedFriendId != null) {
      //Sets it as read
      sendMessage({
        type: 'friend-msg-viewed',
        data: selectedFriendId
      });
    }

    //Hides settings menu
    if (usrSettingsOpen == true) {
      $('#user-settings-container').addClass('d-none');
      usrSettingsOpen = false;
    }
  }
  badgeUpdate();
  ytClose();

});

$('#show-add-friend-container').click(function () {
  $('#my-friends-list').addClass('d-none');
  
  $('#my-friends-container .selected').removeClass('selected');
  $(this).addClass('selected');

  $('#friend-chat-list-container').hide();
  $('#my-friends-list').addClass('d-none');

  $('#friend-list-container').show();
  $('#add-friend-request-container').removeClass('d-none');

  selectedFriendId = null;
  selectedFriendId_storage = null;
});

$('#my-friends-container .btn-close').click(function () {
  $('#my-friends-container').removeClass('show');
  selectedFriendId_store();
  friendListOpen = false;
  messageBox.show();
});

$('#add-friend-request-container .btn-close').click(function () {
  $('#add-friend-request-container').addClass('d-none');
  selectedFriendId_store();
  friendListOpen = false;
  messageBox.show();
});

$('#knock-group-container').on('click', '.accept-friend', function () {
  var $container = $(this).parents('.add-friend-container');
  acceptFriend($container.data('id'));
  return false;
});

$('#knock-group-container').on('click', '.ignore-friend', function () {
  var $container = $(this).parents('.add-friend-container');
  ignoreFriend($container.data('id'));
  return false;
});

$('#add-friend').click(function () {
  var playerId = $('#show-player-settings').siblings('.popup-menu').data('playerId');
  addFriend(playerId);
});


//Tells the backend to send friend request
function addFriend(playerId) {
  sendMessage({
    type: 'add-friend',
    data: playerId,
  });
  if (!friendIds.includes(playerId)) {
    friendIds.push(playerId);
  }
  if (!pendingRequestIds.includes(playerId)) {
    pendingRequestIds.push(playerId);
  }

  $('#show-friend-list').removeClass('d-none');
  $("#suggested-" + playerId).remove();

  mixpanel.track('Send Friend Request', {
    'ownId': ownId,
    'friendId': playerId
  });
}

$('#pending-requests-list').on('click', '.accept-friend', function () {
  var $container = $(this).parents('.pending-request-item');
  var friend = JSON.parse($container.data('friend'));
  acceptFriend(friend._id);
  return false;
});

$('#pending-requests-list').on('click', '.ignore-friend', function () {
  var $container = $(this).parents('.pending-request-item');
  var friend = JSON.parse($container.data('friend'));
  ignoreFriend(friend._id);
  return false;
});

//Perspective of the player that initiates the friend removal
$('#my-friends-list').on('click', '.remove-friend', function () {
  var $container = $(this).parents('.friend-item');
  var removeFriendId = JSON.parse($container.data('friend'))._id;

  sendMessage({
    type: 'remove-friend',
    data: removeFriendId
  });

  sendMessage({
    type: 'friend-msg-viewed',
    data: removeFriendId
  });

  badgeUpdate();

  $('#right-friend-item-' + (JSON.parse($container.data('friend'))._id)).remove();

  var idx = friendIds.indexOf(JSON.parse($container.data('friend'))._id);
  if (idx > -1) {
    friendIds.splice(idx, 1);
  }

  $container.remove();

  mixpanel.track('Remove Friend', {
    'ownId': ownId,
    'friendId': removeFriendId
  });

  return false;

});


$('#my-friends-list').on('click', '.ring-friend', function () {
  var $container = $(this).parents('.friend-item');
  var friendId = JSON.parse($container.data('friend'))._id;
  sendMessage({
    type: 'ring-friend',
    data: friendId
  });

  mixpanel.track('Ring Friend', {
    'ownId': ownId,
    'friendId': friendId
  });

  return false;
});

$('#my-friends-list').on('click', '.invite-friend', function () {
  var $container = $(this).parents('.friend-item');
  var friend = JSON.parse($container.data('friend'));
  sendMessage({
    type: 'invite-friend',
    data: friend._id
  });

  return false;
});

$('#ring-friend').click(function () {
  ringFriend();
});

function ringFriend() {
  sendMessage({
    type: 'ring-friend',
    data: selectedFriendId
  });

  mixpanel.track('Ring Friend', {
    'ownId': ownId,
    'friendId': selectedFriendId
  });
}

$('#invite-friend').click(function () {
  sendMessage({
    type: 'invite-friend',
    data: selectedFriendId
  });

  mixpanel.track('Invite Friend', {
    'ownId': ownId,
    'friendId': selectedFriendId
  });
});

$('#add-friend-by-name').click(function () {
  if (!$('#add-friend-username').val()) {
    $.notify("Username not found", {
      type: 'danger'
    });
    return;
  }
  sendMessage({
    type: 'add-friend-by-address',
    data: $('#add-friend-username').val()
  });
});

$('#show-friend-list').click(function () {
  $('#my-friends-container .selected').removeClass('selected');
  $(this).addClass('selected');

  $('#add-friend-request-container').addClass('d-none');
  $('#friend-chat-list-container').hide();

  $('#friend-list-container').show();
  $('#my-friends-list').removeClass('d-none');

  selectedFriendId = null;
  selectedFriendId_storage = null;
});

$('#my-friends-list').on('click', '.chat-friend', function () {
  var friend = JSON.parse($(this).parents('.friend-item').data('friend'));
  startFriendChat(friend);
  badgeUpdate();
});

$('#right-my-friends-list').on('click', '.right-friend-item', function () {
  var friend = JSON.parse($(this).data('friend'));
  startFriendChat(friend);
  badgeUpdate();
});

$('#friend-msg').keypress(function (e) {
  $('#wave-first-time').remove();
  if ($(this).val() && e.keyCode == 13) {
    sendMessage({
      type: 'friend-msg',
      data: {
        friendId: selectedFriendId,
        msg: $(this).val()
      }
    });
    $(this).val('');
    //update-friend-status
    //Check if friend is not online, if not online send them an email to let them know they have a message
    if (!onlineFriends.includes(selectedFriendId)) {
      userOfflineMsgEmail(selectedFriendId);
    }
  }
});

function initFriendList(data) {
  var friends = data.friends;
  var pendingRequests = data.pendingRequests;
  $('#pending-request-count').text(pendingRequests.length);
  checkPendingRequests();

  //Checking if the user has friends
  if (friends.length == 0) {
    //Shows the add friends page and hides the All Friends button
    $('#show-friend-list').addClass('d-none');
    $('#show-add-friend-container').click();
    $('#no-friends-add-text').removeClass('d-none');

    //Hides the add coins button (aka the gifting system (without coin purchases - since it isn't implemented yet))
    //When implemented, hide the friend gifting system container
    $('#add-coins-button').removeClass('d-none');
  } else {
    //Initializes the friend list and friend gifting system
    $('#events-no-friends-text').addClass('d-none');

    //Shows the All Friends page & updates notification badges
    $('#show-friend-list').click();
    badgeUpdate();
    
    for (i = 0; i < friends.length; i++) {
      //Stores the current friend
      var row = friends[i];
      var friend;

      //Checks users friends by eliminating ownId (future: we can do this on back end)
      if (row.sender._id != ownId) {
        friend = row.sender;
      } else {
        friend = row.receiver;
      }

      //Adds the user to the All Friends page
      var $clone = $('.friend-item-clone').clone()
        .removeClass('friend-item-clone d-none')
        .addClass('friend-item')
        .data('friend', JSON.stringify(friend))
        .attr('id', 'friend-item-' + friend._id);
      if (friend.avatar) {
        $clone.find('.friend-avatar').css('background-image', 'url(' + friend.avatar + ')');
      }
      $clone.find('.player-name').text(friend.name);
      if (data.status[friend._id]) {
        $clone.find('.network-state').removeClass('off-line').addClass('on-line');
        onlineFriends_add(friend._id);
      }
      $clone.appendTo('#my-friends-list');

      //Checking that there is a convo open (directly click to text), adds the friend to left click menu if open
      sendMessage({
        type: 'check-chat-history',
        data: row
      });

      //Adds the friend to the friendIds array if not already included
      if (!friendIds.includes(friend._id)) {
        friendIds.push(friend._id);
      }


      //Adds users to the event creation page
      var avatarBgImg = "";
      if (friend.avatar) {
        avatarBgImg = "background-image: url('" + friend.avatar + "');";
      }

      $('#events-friend-list').append(`
                  <div id="event-invite-item-${friend._id}" class="justify-content-between mb-2 mutual-friend-item d-flex">
                      <div class="d-flex align-items-center">
                          <img class="friend-avatar" style="left: 0; width: 38px; height: 38px; ${avatarBgImg}">
                          <span class="player-name" style="color: #000;"> &nbsp; ${friend.name}</span>
                          <a id="event-invite-item-btn-${friend._id}" onclick="addEventInvite('${friend._id}')" class="btn btn-success font-weight-bold text-success" style="border: 0; background-color: Transparent; border-radius: 25px; right: 10px; position: absolute;">Invite</a>
                      </div>
                  </div>`);
    }

    //Checks gift status of each friend
    checkGifts();
  }
  if (pendingRequests.length) {
    for (i = 0; i < pendingRequests.length; i++) {
      var row = pendingRequests[i];
      var friend;
      if (row.sender._id == ownId) {
        friend = row.receiver;
      } else {
        friend = row.sender;
      }
      var $clone = $('.pending-request-item-clone').clone()
        .removeClass('pending-request-item-clone d-none')
        .addClass('pending-request-item d-flex')
        .data('friend', JSON.stringify(friend))
        .attr('id', 'pending-request-item-' + friend._id);
      if (friend.avatar) {
        $clone.find('.friend-avatar').css('background-image', 'url(' + friend.avatar + ')');
      }
      $clone.find('.player-name').text(friend.name);
      $clone.appendTo('#pending-requests-list');

      if (!friendIds.includes(friend._id)) {
        friendIds.push(friend._id);
        pendingRequestIds.push(friend._id);
      }
    }

    $('#notify-pending-request').show();
  }
}



//Adds the convo to the left of the screen
function openConvo(row) {
  var friend = row.row;
  
  if (friend.sender._id == ownId) {
    friend = friend.receiver;
  } else {
    friend = friend.sender;
  }

  //Adds the user to the left area (directly click to text)
  var $clone = $('.right-friend-item-clone').clone()
  .removeClass('right-friend-item-clone d-none')
  .addClass('right-friend-item')
  .data('friend', JSON.stringify(friend))
  .attr('id', 'right-friend-item-' + friend._id);
  if (friend.avatar) {
    $clone.find('.friend-avatar').css('background-image', 'url(' + friend.avatar + ')');
  }
  $clone.find('.player-name').text(friend.name);

  //Checks if the friend is online
  if (onlineFriends.includes(friend._id)) {
    //If they're online, it updates their badge to online
    $clone.find('.network-state').removeClass('off-line').addClass('on-line');
  }

  //Adds the element to the left tab
  $clone.appendTo('#right-my-friends-list');

  if (!row.existingChat) {
    $('#right-friend-item-' + friend._id).addClass('d-none');
  }
}



function acceptedFriend(friend) {
  $.notify('You and ' + friend.name + ' are now friends', {
    type: 'success'
  });

  addedFriend(friend);

  if (!pendingRequestIds.includes(friend._id)) {
    pendingRequestIds.splice(pendingRequestIds.indexOf(friend._id), 1);
  }

  mixpanel.track('Accept Friend Request', {
    'ownId': ownId,
    'friendId': friend._id
  });

  checkPendingRequests();
}

function ignoredFriend(data) {
  // $.notify(data.name + ' didn\'t accept you as a friend', {
  //   type: 'danger'
  // });

  var idx = friendIds.indexOf(data.playerId);
  if (idx > -1) {
    friendIds.splice(idx, 1);
  }

  if (!pendingRequestIds.includes(data.playerId)) {
    pendingRequestIds.splice(pendingRequestIds.indexOf(data.playerId), 1);
  }
  checkPendingRequests();
}

function receiveFriendRequest(playerInfo) {
  if (playerInfo) {
    playerInfo._id = playerInfo.id;
    if (!pendingRequestIds.includes(playerInfo.id)) {
      pendingRequestIds.push(playerInfo.id);
    }
    var $friendContainer = $('.add-friend-container-clone').clone()
      .removeClass('add-friend-container-clone')
      .addClass('add-friend-container');
    $friendContainer.data('id', playerInfo.id)
      .attr('id', 'add-friend-' + playerInfo.id)
      .find('.player-name')
      .text(playerInfo.name);

    $('#knock-group-container').prepend($friendContainer);
    
    checkPendingRequests();
    var $clone = $('.pending-request-item-clone').clone()
      .removeClass('pending-request-item-clone d-none')
      .addClass('pending-request-item d-flex')
      .data('friend', JSON.stringify(playerInfo))
      .attr('id', 'pending-request-item-' + playerInfo._id);
    if (playerInfo.avatar) {
      $clone.find('.friend-avatar').css('background-image', 'url(' + playerInfo.avatar + ')');
    }
    $clone.find('.player-name').text(playerInfo.name);
    $clone.appendTo('#pending-requests-list');

    $('#notify-pending-request').show();

    setTimeout(() => {
      $('#add-friend-' + playerInfo.id).remove();
    }, 5000);

    if (!friendIds.includes(playerInfo.id)) {
      friendIds.push(playerInfo.id);
    }
  }
}

function addedFriend(friend, status = true) {
  var $clone = $('.friend-item-clone').clone()
    .removeClass('friend-item-clone d-none')
    .addClass('friend-item')
    .data('friend', JSON.stringify(friend))
    .attr('id', 'friend-item-' + friend._id);
  if (friend.avatar) {
    $clone.find('.friend-avatar').css('background-image', 'url(' + friend.avatar + ')');
  }
  $clone.find('.player-name').text(friend.name);
  $clone.appendTo('#my-friends-list');

  if (status) {
    $clone.find('.network-state').removeClass('off-line').addClass('on-line');
    onlineFriends_add(friend._id);
  }

  // var $clone = $('.right-friend-item-clone').clone()
  //   .removeClass('right-friend-item-clone d-none')
  //   .addClass('right-friend-item')
  //   .data('friend', JSON.stringify(friend))
  //   .attr('id', 'right-friend-item-' + friend._id);
  // if (friend.avatar) {
  //   $clone.find('.friend-avatar').css('background-image', 'url(' + friend.avatar + ')');
  // }
  // $clone.find('.player-name').text(friend.name);
  // $clone.appendTo('#right-my-friends-list');

  // if (status) {
  //   $clone.find('.network-state').removeClass('off-line').addClass('on-line');
  //   onlineFriends_add(friend._id);
  // }

  if (!friendIds.includes(friend._id)) {
    friendIds.push(friend._id);
    loadFriendSuggestions();
  }
}

//The perspective of the user that gets removed
function removeFriend(playerId) {
  $('#friend-item-' + playerId).remove();
  $('#right-friend-item-' + playerId).remove();

  var idx = friendIds.indexOf(playerId);
  if (idx > -1) {
    friendIds.splice(idx, 1);
  }

  sendMessage({
    type: 'friend-msg-viewed',
    data: playerId
  });

  badgeUpdate();
}

function ringFriend(player) {
  ring.play();
  var $knockContainer = $('.knock-notify-container-clone').clone()
    .removeClass('knock-notify-container-clone')
    .addClass('knock-notify-container ring-friend-container');
  $knockContainer.data('id', player.id)
    .attr('id', 'knock-' + player.id)
    .find('.player-name')
    .text(player.name);
  $('#knock-group-container').prepend($knockContainer);

  if (desktopApp) {
    new Notification(`🚪 ${player.name} is at your door. Let them know you're home!`);
  }
}

function updateFriendStatus(data) {
  var $friendItem = $('#friend-item-' + data.playerId);
  var $rightFriendItem = $('#right-friend-item-' + data.playerId);
  if (data.status) {
    $friendItem.find('.network-state').removeClass('off-line').addClass('on-line');
    $rightFriendItem.find('.network-state').removeClass('off-line').addClass('on-line');
    onlineFriends_add(data.playerId);

    // Show notify
    var $notifyUpdateFriendStatus = $('.update-friend-status-clone').clone().removeClass('update-friend-status-clone d-none').addClass('update-friend-status');
    $notifyUpdateFriendStatus.prepend($friendItem.find('.friend-avatar').clone());
    $notifyUpdateFriendStatus.find('.friend-name').text($friendItem.find('.player-name').text());
    $notifyUpdateFriendStatus.attr('onclick', `closeUserOnlineNotify('${data.playerId}')`);
    $notifyUpdateFriendStatus.attr('id', `notify-friend-status-${data.playerId}`).appendTo('#knock-group-container');
    setTimeout(() => {
      $(`#notify-friend-status-${data.playerId}`).remove();
    }, 3000);


  } else {
    $friendItem.find('.network-state').addClass('off-line').removeClass('on-line');
    $rightFriendItem.find('.network-state').addClass('off-line').removeClass('on-line');
    onlineFriends_remove(data.playerId);
  }
}

//Function to close the user is online notification
function closeUserOnlineNotify(friendId) {
  $(`#notify-friend-status-${friendId}`).remove();
}

function inviteFriend(data) {
  var $invitationContainer = $('.invitation-container-clone').clone()
    .removeClass('invitation-container-clone')
    .addClass('invitation-container friend-invitation');
  $invitationContainer.data('id', data.playerId)
    .data('address', data.address)
    .attr('id', 'invitation-' + data.playerId)
    .find('.player-name')
    .text(data.name);
  $('#knock-group-container').prepend($invitationContainer);

  if (desktopApp) {
    new Notification(`🏠 ${data.name} invited you home. Don't keep them waiting!`);
  }
}

function acceptFriend(playerId) {
  sendMessage({
    type: 'accept-friend',
    data: playerId,
  });

  $(`#add-friend-${playerId}`).remove();
  $(`#pending-request-item-${playerId}`).remove();

  $('#pending-request-count').text($('#pending-requests-list .pending-request-item').length);
  if (!$('#pending-requests-list .pending-request-item').length) {
    $('#notify-pending-request').hide();
  }

  $('#show-friend-list').removeClass('d-none');
  $('#no-friends-add-text').addClass('d-none');
}

function ignoreFriend(playerId) {
  sendMessage({
    type: 'ignore-friend',
    data: playerId,
  });

  $(`#add-friend-${playerId}`).remove();
  $(`#pending-request-item-${playerId}`).remove();

  $('#pending-request-count').text($('#pending-requests-list .pending-request-item').length);
  if (!$('#pending-requests-list .pending-request-item').length) {
    $('#notify-pending-request').hide();
  }

  var idx = friendIds.indexOf($container.data('id'));
  if (idx > -1) {
    friendIds.splice(idx, 1);
  }
}

function startFriendChat(friend) {
  selectedFriendId = friend._id;

  $('#my-friends-container .selected').removeClass('selected');

  $('#add-friend-container').addClass('d-none');
  $(`#right-friend-item-${friend._id}`).addClass('selected');
  $('#friend-list-container').hide();
  $('#friend-chat-list-container').show();
  $('#friend-chat-list').empty();
  $('#selected-friend-name').text(friend.name);

  sendMessage({
    type: 'friend-chat-history',
    data: friend._id
  });
  sendMessage({
    type: 'friend-msg-viewed',
    data: friend._id
  });

  badgeUpdate();
}

function friendMsg(data) {
  var currentFriend;

  //When sending a message
  if (data.sender == ownId) {
    currentFriend = data.receiver;

    mixpanel.track('Send Message', {
      'ownId': ownId,
      'friendId': currentFriend
    });

    //When sending a message and chat is open
    if (selectedFriendId == data.receiver) {
      $('#friend-chat-list').append(`<div class="replies"><p>${data.msg}</p></div>`);
      //Scrolls to bottom when a new message is sent
      $('#friend-chat-list').animate({
        scrollTop: $('#friend-chat-list')[0].scrollHeight
      }, 500);
      //Tracks when a message is sent
      pioneerAnalytics.active();
      //Sends the message to the server
      sendMessage({
        type: 'friend-msg-viewed',
        data: data.sender
      });
    } 
  } else {
    //When receiving a message
    currentFriend = data.sender;

    mixpanel.track('Receive Message', {
      'ownId': ownId,
      'friendId': currentFriend
    });

    mixpanel.track('Receive Message', {
      'ownId': ownId,
      'friendId': currentFriend
    });

    //When sending a message and chat is closed
    if (desktopApp) {
      badgeUpdate();
      var $item = $('#friend-item-' + data.sender);
      var friendName = JSON.parse($item.data('friend')).name;
      new Notification(`${friendName}: ${data.msg}`, {
        sound: '/sounds/notification.mp3',
      });
    }

    //Checks if the user has a chat open when receiving a message
    if (selectedFriendId == data.sender) {
      //Adds the new message received
      $('#friend-chat-list').append(`<div class="sent"><p>${data.msg}</p></div>`);
      //Scrolls to bottom when a new message is received
      $('#friend-chat-list').animate({
        scrollTop: $('#friend-chat-list')[0].scrollHeight
      }, 500);
      //Sets the message as viewed
      sendMessage({
        type: 'friend-msg-viewed',
        data: data.sender
      });
      badgeUpdate();
      
    } else {
      //Show in-game message notification
      var $item = $('#friend-item-' + data.sender);
      var friendName = JSON.parse($item.data('friend')).name;
      var audio = new Audio('/sounds/notification.mp3');
      audio.play(); 


      //Crops the text if it's too long (> 20 chars) for a notification
      if ((data.msg).length > 20) {
        data.msg = (data.msg).substring(0, 20) + "...";
      }

      //Manages the notification visually
      var $friendItem = $('#friend-item-' + data.sender);
      var $friendMessageNotification = ($('.friend-message-clone').clone()).removeClass('d-none');
      $friendMessageNotification.prepend(($friendItem.find('.friend-avatar').clone()));
      $friendMessageNotification.find('.friend-name').text($friendItem.find('.player-name').text());
      $friendMessageNotification.find('.friend-message').text((`${data.msg}`));
      $friendMessageNotification.attr('class', `friend-message-${data._id}`).appendTo('#knock-group-container');
      $friendMessageNotification.addClass('friend-message-clone-style').fadeIn(300);
      $friendMessageNotification.find('.network-state').removeClass('network-state');

      //Makes the message notification clickable, on press it opens the chat
      $(`.friend-message-${data._id}`).click(function () {
        $('#friend-list').click();
        $('#right-friend-item-' + data.sender).click();
      });

      //Makes the notification disappear after 3s
      setTimeout(() => {
        $(`.friend-message-${data._id}`).remove();
      }, 3000);
      badgeUpdate();
    }
  }
  $('#right-friend-item-' + currentFriend).removeClass('d-none');
}

function chatHistory(data) {
  $('#friend-chat-list').empty();
  if ((data.chatHistory).length == 0) {
    $('#friend-chat-list').append(`<center id="wave-first-time"><a class="btn btn-success" onclick="waveUser()" style="border-radius: 25px; background-color: #9eeaff; border: 0;" data-toggle="tooltip" title="Wave" data-placement="bottom">👋&nbsp;</a></center>`);
  } else {
    if (data.friendId == selectedFriendId) {
      for (chat of data.chatHistory) {
        if (chat.sender == ownId) {
          $('#friend-chat-list').append(`<div class="replies"><p>${chat.msg}</p></div>`);
        } else {
          $('#friend-chat-list').append(`<div class="sent"><p>${chat.msg}</p></div>`);
        }
      }
      //Scrolls the chat to the bottom after loading chat history
      $('#friend-chat-list').animate({
        scrollTop: $('#friend-chat-list')[0].scrollHeight
      }, 0);
    }
  }
}

$('#chat-friend').click(function () {
  $('#my-friends-container').addClass('show');
  $('#show-friend-list').addClass('selected');
  var playerId = $('#show-player-settings').siblings('.popup-menu').data('playerId');
  var playerInfo = playerInfoList[playerId];
  playerInfo._id = playerId;
  startFriendChat(playerInfo);

  sendMessage({
    type: 'friend-msg-viewed',
    data: playerId
  });
  badgeUpdate();
});




function mutualFriendsQuickAdd(data) {
  $('#mutual-friends-list').html('');
  var counter = 0;
  if ((data.mutualFriends).length != 0) {
    $('#friend-suggestions-title-text').removeClass('d-none');
    while (counter < (data.mutualFriends).length) {
      var friendId = (data.mutualFriends[counter][0]);
      var matchesNum = (data.mutualFriends[counter][1]);
      if (friendIds.includes(friendIds) == false){
        suggestedFriendsVisualAdd(friendId);

        sendMessage({
          type: 'get-friend-suggestion-data',
          data: friendId
        });
      }
      counter += 1
    }
  }
}



function suggestedFriendsVisualAdd(data) {
  if (data.friendId != undefined) {
    var friendSuggestionDivId = "suggested-" + data.friendId;

    //Adds users to the event creation page
    var avatarBgImg = "";
    if (data.avatar) {
      avatarBgImg = "background-image: url('" + data.avatar + "');";
    }


    $('#mutual-friends-list').append(`
      <div id="${friendSuggestionDivId}" class="justify-content-between mb-2 mutual-friend-item d-flex" style="position: relative;">
        <div class="d-flex align-items-center">
          <div class="position-relative friend-avatar" style="left: 0; ${avatarBgImg}">
          </div>
          <span class="ml-2 player-name font-weight-bold" style="color: #000;"> ${data.name} </span>
          <a class="btn font-weight-bold text-success" style="position: absolute; right: 0;" onclick="addFriend('${data.friendId}')"> Add &nbsp; </a>
        </div>
      </div>`);

  }
}

//Gets called to load friend suggestions
async function loadFriendSuggestions() {
  sendMessage({type: 'get-mutual-friends',
    data: ownId
  });
}

//Function to check if there are any pending requests, if there are then show the title.
function checkPendingRequests() {
  if (pendingRequestIds != []) {
    $('#pending-requests-count').removeClass('d-none');
  } else {
    $('#pending-requests-count').addClass('d-none');
  }
}

function waveUser () {
  sendMessage({
    type: 'friend-msg',
    data: {
      friendId: selectedFriendId,
      msg: '👋'
    }
  });

  mixpanel.track('Friend Wave', {
    'ownId': ownId,
    'friendId': selectedFriendId
  });

  $('#wave-first-time').remove();
}