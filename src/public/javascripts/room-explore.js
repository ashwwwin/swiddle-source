//Allowed file types for room image
const validImageTypes = ['image/gif', 'image/jpeg', 'image/png'];

function toggleRoomLock() {
  mixpanel.track('Toggle Room Lock', {
    'ownId': ownId,
    'toggleTo': homeOwner.lockedRoom
  });

  homeOwner.lockedRoom = !homeOwner.lockedRoom;
  sendMessage({
    type: 'change-locked',
    data: homeOwner.lockedRoom
  });
  if (homeOwner.lockedRoom) {
    $('#change-lock-room').removeClass('btn-danger').addClass('btn-success').text('Unlock');
    $('.fa-unlock').removeClass('fa-unlock').addClass('fa-lock');
  } else {
    $('#change-lock-room').removeClass('btn-success').addClass('btn-danger').text('Lock');
    $('.fa-lock').removeClass('fa-lock').addClass('fa-unlock');
  }
}

$('#save-room-settings').click(function () {
  mixpanel.track('Save Room Settings', {
    'ownId': ownId
  });

  //Limits the numbers of characters
  $('#room-name').val((($('#room-name').val()).substring(0, 15)));
  $('#room-desc').val((($('#room-desc').val()).substring(0, 50)));

  //Updates the text
  liveDisplayRoomOptions()

  //Tells the server to update the room settings
  sendMessage({
    type: 'change-room-settings',
    data: {
      roomName: $('#room-name').val(),
      roomDesc: $('#room-desc').val(),
      maxUsers: $('#room-max-users').val()
    }
  });

  //Uploads the image
  roomImageUpload();


  homeOwner.roomName = $('#room-name').val();
  homeOwner.roomDesc = $('#room-desc').val();
  homeOwner.maxUsers = $('#room-max-users').val();
});

function setPublicRoomList(roomList) {
  $('#room-explore-panel .public-room-item').remove();
  if (!roomList) {
    return;
  }
  for (let roomInfo of roomList) {
    // This prevents the user from seeing their own room on the explore page
    // if (roomInfo[0] == roomId) {
    //   continue;
    // }
    roomInfo = roomInfo[1];

    const playerCount = Object.keys(roomInfo.playerInfoList).length
    if (playerCount >= roomInfo.maxUsers) {
      continue;
    }

    const owner = roomInfo.playerInfoList[roomInfo.ownerId];
    const $cloneRoom = $('.clone-public-room-item').clone();
    $cloneRoom.removeClass('d-none clone-public-room-item').addClass('public-room-item');
    $cloneRoom.find('.room-name').text(roomInfo.roomName || `${owner.name}'s home`);
    $cloneRoom.find('.room-desc').text(roomInfo.roomDesc);
    $cloneRoom.find('.room-users-state').text(`${playerCount}/${roomInfo.maxUsers}`);
    $cloneRoom.find('.enter-another-room').attr('data-id', roomInfo.ownerId);
    $cloneRoom.find('img').attr('src', '/images/room-images/' + roomInfo.roomImage);

    if (roomInfo.roomVerified) {
      $cloneRoom.find('.room-verified-badge').removeClass('d-none');
    }


    $('#room-explore-panel .row').append($cloneRoom);
  }
}

$('#show-room-explore').click(function () {
  $('#my-friends-container .selected').removeClass('selected');
  $(this).addClass('selected');

  $('#friend-list-container').hide();
  $('#friend-chat-list-container').hide();
  $('#room-explore-panel').show();
});


$('#room-explore-panel').on('click', '.enter-another-room', function () {
  mixpanel.track('Enter Explore Room', {
    'ownId': ownId,
    'roomOwnerId': $(this).data('id')
  });

  sendMessage({
    type: 'ring-friend',
    data: $(this).data('id')
  });

  return false;
});

function lockedRoom(playerId) {
  $(`.enter-another-room[data-id=${playerId}]`).parents('.public-room-item').remove();
}

function unlockedRoom(roomInfo) {
  // This stops the users own room from being visible
  // if (roomInfo.ownerId == ownId) {
  //   return;
  // }
  $(`.enter-another-room[data-id=${roomInfo.ownerId}]`).parents('.public-room-item').remove();

  const playerCount = Object.keys(roomInfo.playerInfoList).length
  if (playerCount >= roomInfo.maxUsers) {
    return;
  }

  const owner = roomInfo.playerInfoList[roomInfo.ownerId];
  const $cloneRoom = $('.clone-public-room-item').clone();
  $cloneRoom.removeClass('d-none clone-public-room-item').addClass('public-room-item');
  $cloneRoom.find('.room-name').text(roomInfo.roomName || `${owner?.name}'s home`);
  $cloneRoom.find('.room-desc').text(roomInfo.roomDesc);
  $cloneRoom.find('.room-users-state').text(`${playerCount}/${roomInfo.maxUsers}`);
  $cloneRoom.find('.enter-another-room').attr('data-id', roomInfo.ownerId);
  $cloneRoom.find('img').attr('src', '/images/room-images/' + roomInfo.roomImage);

  if (roomInfo.roomVerified) {
    $cloneRoom.find('.room-verified-badge').removeClass('d-none');
  }

  $('#room-explore-panel .row').append($cloneRoom);
}

//My room options button 
$('#my-room-options').on('click', function () {
  if (userInfo.verified) {
    $('#room-verified-badge-sample').removeClass('d-none');
  }


  $('#room-image-sample').attr('src', ('/images/room-images/' + userInfo.roomImage));


  //Hides the explore page & header
  $('#explore-header').addClass('d-none');
  $('#room-explore-panel').addClass('d-none');

  //Shows my room options page & header
  $('#my-room-options-header').removeClass('d-none');
  $('#my-room-options-container').removeClass('d-none');

  //Updates the room name in the sample display
  if ($('#room-name').val() == '') {
    $('#sample-room-name').text(`${userInfo.name}'s home`);
  } else {
    $('#sample-room-name').text(($('#room-name').val()));
  }
});


//Explore all button
$('#explore-all-btn').on('click', function () {
  //Hides my room options page & header
  $('#my-room-options-header').addClass('d-none');
  $('#my-room-options-container').addClass('d-none');

  //Shows the explore page & header
  $('#explore-header').removeClass('d-none');
  $('#room-explore-panel').removeClass('d-none');
});

function liveDisplayRoomOptions() {
  if ($('#room-name').val() == '') {
    $('#sample-room-name').text(`${userInfo.name}'s home`);
  } else {
    $('#sample-room-name').text(($('#room-name').val()));
  }
  $('#sample-room-desc').text($('#room-desc').val());
  $('#sample-room-max-users').text('1/' + $('#room-max-users').val());
}

//Runs when an image gets selected
$(document).ready(function () {
  $('input[type="file"]').change(function (e) {
    var fileName = e.target.files[0];
    //If it's an invalid image
    if (!validImageTypes.includes(fileName.type)) {
      //Clear the image selection
      $('#my-room-image-uploaded').val('');

      //Notify
      $.notify('Invalid image (png/jpeg/gif only)', {
        type: 'danger',
      });
    } else if ((fileName.size / 1024 / 1024) > 1) {
      $.notify('Max file size is 1mb', {
        type: 'danger',
      });
    } else {
      //Display the image
      var displayRoomImage = URL.createObjectURL(fileName);
      $('#room-image-sample').attr('src', displayRoomImage);

      $.notify("Don't forget to save your changes", {
        type: 'info',
      });
    }
  });
});

//Function to upload image
function roomImageUpload() {
  if (document.getElementById("my-room-image-uploaded").files.length != 0) {
    //Getting the image from the form
    var files = new FormData(), url = 'my-room-image-upload';
    var uploadedFile = $('#my-room-image-uploaded')[0].files[0];
    files.append('fileName', uploadedFile);

    var fileSize = uploadedFile.size / 1024 / 1024;

    //Checking if the file type is valid
    if (!validImageTypes.includes(uploadedFile.type)) {
      $.notify('Invalid image (png/jpeg/gif only)', {
        type: 'danger',
      });
    } else if (fileSize > 1) {
      $.notify('Max file size is 1mb', {
        type: 'danger',
      });
    } else {
      //Uploading the image
      $.ajax({
        url: 'my-room-image-upload',
        type: 'post',
        processData: false,
        contentType: false,
        data: files,
        success: function (data) {
          //Once the image has been upload successful, link the image to the user's room
          $.ajax({
            url: 'my-room-image-upload-success',
            type: 'post',
            data: {
              fileName: data.data,
              ownId: ownId,
              token: userInfo.token
            },
            success: function () {
              mixpanel.track('New Room Image', {
                'ownId': ownId
              });

              //Updates the room image globally
              setTimeout(function () {
                sendMessage({
                  type: 'update-room-image'
                });
              }, 1000);

              //Notifies the user that the image was uploaded
              $.notify('Image uploaded', {
                type: 'success',
              });

              //Updates the userInfo
              userInfo.roomImage = data.data;

              //Clears the image uploaded
              $('#my-room-image-uploaded').val('');
            }
          });
        }
      });
    }
  }
}