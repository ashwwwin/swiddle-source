var usrSettingsOpen = false;

//Settings toggle
$('#show-settings-button').click(function () {
  if (usrSettingsOpen == true) {
    //If it's open then close it
    $('#user-settings-container').addClass('d-none');
    usrSettingsOpen = false;

  } else {
    //If it's closed open it
    $('#user-settings-container').removeClass('d-none');
    usrSettingsOpen = true;
    loadSettingsPage();

    //Hides friends menu
    if (friendListOpen == true) {
      $('#my-friends-container').removeClass('show');
      friendListOpen = false;
    }

  }
});


//Close button function
$('#user-settings-screen .btn-close').click(function () {
  $('#user-settings-container').addClass('d-none');
  usrSettingsOpen = false;
  messageBox.show();
});


//Nav-buttons
$('#user-settings-screen-nav-profile').click(function () {
  //Hide share access page
  $('#user-settings-screen-nav-share-access').removeClass('selected');
  $('#user-settings-share-access-screen').addClass('d-none');

  //Show profile page
  $('#user-settings-screen-nav-profile').addClass('selected');
  $('#user-settings-profile-screen').removeClass('d-none');
});

$('#user-settings-screen-nav-share-access').click(function () {
  //Hide profile page
  $('#user-settings-screen-nav-profile').removeClass('selected');
  $('#user-settings-profile-screen').addClass('d-none');

  //Show share access page
  $('#user-settings-screen-nav-share-access').addClass('selected');
  $('#user-settings-share-access-screen').removeClass('d-none');

  //Loads number of invites the user has remaning
  $.ajax({
    url: '/get-access-count',
    type: 'post',
    dataType: 'json',
    data: {
      id: ownId
    },
    success: function (data) {
      if (data > 0) {
        $('#remaining-access').text(data);
      } else {
        $('#share-access').remove();
        $.notify("No invites left", {
          type: 'danger'
        });
      }
    }
  })
});


//Save button for user profile
$('#user-settings-profile-save').click(function () {
  mixpanel.track('Save Profile', {
    'ownId': ownId
  });

  pioneerAnalytics.active();

  //Updates name & bio
  $.ajax({
    url: "user-settings-profile-save",
    type: "post",
    dataType: "json",
    data: {
      id: ownId,
      name: $('#user-settings-profile-name').val(),
      bio: $('#user-settings-profile-bio').val(),
    },
    success: function () {
      userInfo.name = $('#user-settings-profile-name').val();
      userInfo.bio = $('#user-settings-profile-bio').val();

      $.notify('Profile successfully updated', {
        type: 'success',
      });
    }
  });


  //Checks if user has changes their username aka addresss
  //Updates username aka address
  var address = $('#user-settings-profile-username').val();
  if (!address || !addressValidator.test(address)) {
    $.notify('Please enter your address correctly', {
      type: 'danger'
    });
    return;
  }
  if (userInfo.address != address) {
    $.ajax({
      url: '/set-address',
      type: 'post',
      dataType: 'json',
      data: {
        id: ownId,
        address,
      },
      success: function (result) {
        if (result) {
          sessionStorage.setItem('address', address);
          window.location.href = '/' + address;
        } else {
          // spiner.stop();
          $.notify('This address is used now. Please enter another one.', {
            type: 'danger',
          });
        }
      }
    });
  }
});

//Share access button click
$('#btn-invite').click(function () {
  var email = $('#invite-email').val();
  if (emailValidator.test(email)) {
    $.ajax({
    url: '/share-access',
    type: 'post',
    dataType: 'json',
    data: {
      id: ownId,
      email: email
    },
    success: function (data) {

      mixpanel.track('Sharing access', {
        'ownId': ownId,
        'friendEmail': email
      });

      if (data.success) {
      $.notify('Invite sent!', {
        type: 'success'
      });

      $('#remaining-access').text(data.count);
      if (data.count <= 0) {
        $('#share-access').remove();
      }
      } else {
      $.notify(data.msg, {
        type: 'danger'
      });
      }
    }
    });
  } else {
    $.notify('Invalid email', {
    type: 'danger'
    });
  }
  return false;
  });


function loadSettingsPage() {

  // while (!userInfo) {
  //   sendMessage({type: 'my-info'});
  // }
  //Gets avatar
  var settings_menu_avatar = userInfo.avatar;

  //Loads avatar
  if (!settings_menu_avatar || settings_menu_avatar == 'undefined') {
    //Do nothing if user has default avatar
  } else {
    //Change avatar
    $('#user-settings-avatar-image').attr('src', settings_menu_avatar);

    //Change profile avatar
    $('#user-settings-profile-circle-photo').css({
      'background-image': `url(${settings_menu_avatar})`
    });
  }


  //Loads user data
  $('#user-settings-profile-name').val(userInfo.name);
  $('#user-settings-profile-username').val(userInfo.address);
  $('#user-settings-profile-input-example-username').text("swiddle.io/" + (userInfo.address.toUpperCase()));
  $('#user-settings-profile-bio').val(userInfo.bio);
}