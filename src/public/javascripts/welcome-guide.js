function welcomeGuide() {
  if (!userInfo.guideState) {
    setTimeout(function() {
      welcomeGuide();
    }, 1000);
    return;
  }
  if (userInfo.guideState == 'enable-video-mic') {
    $('#welcome-guide-modal [data-step=enable-video-mic] .btn-next').removeClass('d-none');
  }

  if (userInfo.guideState == 'finish') {
    $('#welcome-guide-modal .guide-step').removeClass('d-flex').addClass('d-none');
    $('#welcome-guide-modal [data-step=enable-video-mic]').addClass('d-flex').removeClass('d-none');
  } else if (userInfo.guideState) {
    $('#welcome-guide-modal .guide-step').removeClass('d-flex').addClass('d-none');
    $('#welcome-guide-modal [data-step=' + userInfo.guideState + ']').addClass('d-flex').removeClass('d-none');
  }

  $('#welcome-guide-modal').modal('show');
}

$('#welcome-guide-modal .btn-next').click(function () {
  pioneerAnalytics.active();
  var step = $(this).parents('.guide-step').data('step');
  if (step == 'address') {
    var address = $('#your-address').val();
    if (!address || !addressValidator.test(address)) {
      $.notify('Please enter your username.', {
        type: 'danger',
      });
      return false;
    }
    if (address.length < 3) {
      $.notify('Please enter more than 3 letters', {
        type: 'danger',
      });
      return false;
    }
    // Convert address for URI
    try {
      address = encodeURIComponent(decodeURIComponent(address).trim().toLowerCase());
    } catch {
      $.notify('This address format is wrong. Please enter another one.', {
        type: 'danger',
      });
      return false;
    }
    if (blackAddressList.includes(address)) {
      $.notify('You can use this address. Please enter another one.', {
        type: 'danger',
      });
      return false;
    }
    //// spiner.spin(document.body);
    $.ajax({
      url: '/set-address',
      type: 'post',
      dataType: 'json',
      data: {
        id: ownId,
        address,
        guide: true
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
  } else if (step == 'birthday') {
    var date = $('#birthday-date').val();
    var month = $('#birthday-month').val();
    var year = $('#birthday-year').val();
    if (!date || !year) {
      $.notify('Please enter your birthday', {
        type: 'danger',
      });
      return false;
    }
    var birthday = new Date(year, month, date);
    if (isNaN(birthday.getTime()) || birthday.getFullYear() != year || birthday.getMonth() != month || birthday.getDate() != date || calculateAge(birthday) > 75 || calculateAge(birthday) < 9) {
      $.notify('Please input a valid birthday', {
        type: 'danger',
      });
      return false;
    }
    $.ajax({
      url: '/set-birthday',
      type: 'post',
      dataType: 'json',
      data: {
        id: ownId,
        birthday: year + '-' + (parseInt(month) +  1) + '-' + date
      },
      success: function () {
        userInfo.guideState = 'got-it';
        welcomeGuide();
      }
    });
  } else if (step == 'got-it') {
    mixpanel.track('Welcome Guide Complete', {
      'ownId': ownId
    });
    userInfo.guideState = 'finish';
    $('#welcome-guide-modal').modal('hide');
    if (enableVideo) {
      openMyVideo();
    }

    setTimeout(() => { checkDailyReward(); }, 60000);
  }
});

function calculateAge(birthday) { // birthday is a date
  var ageDifMs = Date.now() - birthday;
  var ageDate = new Date(ageDifMs); // miliseconds from epoch
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}
