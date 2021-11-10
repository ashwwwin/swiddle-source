var email;
var displayName;
var userInfo = {};
var avatar;

var emailValidator = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

var addressValidator = /^[a-zA-Z0-9]+$/i;

var timeZone = (Intl.DateTimeFormat().resolvedOptions().timeZone);

var queryString = window.location.search;
var urlParams = new URLSearchParams(queryString);



if (urlParams.has('login')) {
  //Showing the login page
  waitlistClick();
  loginShow();
S
  if (urlParams.has('email')) {
    //Getting email if it exists
    const paramEmail = urlParams.get('email');
    
    //Inputting email
    $('#signin-email').val(paramEmail);
  }

  if (urlParams.has('token')) {
    //Getting pass if it exists
    const paramPass = urlParams.get('token');

    //Inputting pass
    $('#signin-password').val(paramPass);
  }

  //Submitting the form if user has email and password
  if (urlParams.has('email') && urlParams.has('token')) {
    $(document).ready(function() { 
      $('#signin-form').submit();
    });
  }
} else if (urlParams.has('register')) {
  waitlistClick();
} 


//Makes the body visible
$(function() {
  $('body').css('opacity', 1);
});

$('#continue-step').click(function () {
  var $button = $(this);
  var step = $button.data('step');
  if (step == 1) {
    email = $('#email').val();
    //Checks if email is taken
    if (emailValidator.test(email)) {
      $('#invalid-email-msg').addClass('d-none');
      $.ajax({
        url: 'check-email',
        type: 'post',
        dataType: 'json',
        data: {
          email: email
        },
        success: function (data) {
          if (data.user) {
            //If user data is found, email is already used
            userInfo = data.user;
            // Security issue, anyone can get all the information of any user with just an email
            // console.log(data.user);
            $('#signin-email').val(email);
            $.notify('Email is taken', {
              type: 'danger'
            })
          } else {
            //Checks if passwords match
            if ($('#password').val() != $('#password-confirmation').val()){
              $.notify('Passwords do not match', {
                type: 'danger'
              })
            } else {
              //If passwords match
              $('#waitlistBody').addClass('d-none');
              $('#snap-login-step').removeClass('d-none');
            }
          }
        }
      });
    } else {
      //If email doesn't exist
      $.notify('Invalid email', {
        type: 'danger'
      })
    }
  }
});


$('#btn-no-snap').click(function () {
  $('#snap-login-step').addClass('d-none').removeClass('d-flex');
  $('#name-input-step').removeClass('d-none').addClass('d-flex');
});

$('#back-snap-login').click(function () {
  $('#name-input-step').addClass('d-none').removeClass('d-flex');
  $('#snap-login-step').removeClass('d-none').addClass('d-flex');
});

$('#btn-finish-step').click(function () {
  if (!$('#name').val()) {
    $('#invalid-name-msg').removeClass('d-none');
    return;
  }
  $('#invalid-name-msg').addClass('d-none');
  $.ajax({
    url: 'finish-signup',
    type: 'post',
    dataType: 'json',
    data: {
      id: userInfo._id,
      name: $('#name').val(),
      email: $('#email').val(),
      timeZone: timeZone,
      path: window.location.pathname
    },
    success: function (data) {
      $('#name-input-step').addClass('d-none').removeClass('d-flex');
      $('#waitlist-step').removeClass('d-none').addClass('d-flex');
      Cookies.set('swiddle_email', data.email, { expires: 5 });
      Cookies.set('swiddle_token', data.token, { expires: 5 });
      if (data.access || data.invitedBy) {
        // sessionStorage.setItem('loggedIn', true);
        sessionStorage.setItem('id', data._id);
        sessionStorage.setItem('name', data.name);
        sessionStorage.setItem('avatar', data.avatar);
        sessionStorage.setItem('address', data.address);
        sessionStorage.setItem('coins', data.coins);
        window.location.href = '/' + data.address;
      } else if (data.emailActivated) {
        $('#email-validation-msg').text('Your spot has been reserved.');
      }
      autoLogin();
    }
  });
});

$('#forgot-password').click(function () {
  $.ajax({
    url: 'forgot-password',
    type: 'post',
    dataType: 'json',
    data: {
      email: $('#signin-email').val()
    },
    success: function (data) {
      if (data.success) {
        $.notify('Check your email', {
          type: 'success'
        });
      }
    }
  });
  return false;
});

// Simple login
$('#btn-signin').click(function () {
  email = $('#email').val();
  password = $('#password').val();
  if (!email || !password) {
    // $.notify('Incorrect email or password', {
    //   type: 'danger'
    // });
    return;
  }
  if (emailValidator.test(email)) {
    $('#invalid-email-msg').addClass('d-none');
  } else {
    $('#invalid-email-msg').removeClass('d-none');
    return;
  }
  $.ajax({
    url: '/login',
    type: 'post',
    dataType: 'json',
    data: {
      email: email,
      password: password,
      timeZone: timeZone,
    },
    success: function (data) {
      if (data.success) {
        $('#waitlistBody').addClass('d-none').removeClass('d-flex');
        Cookies.set('swiddle_email', data.user.email, { expires: 5 });
        Cookies.set('swiddle_token', data.user.token, { expires: 5 });
        mixpanel.identify(data.user.email);
        if (data.user.access || data.user.invitedBy) {
          // sessionStorage.setItem('loggedIn', true);
          sessionStorage.setItem('id', data.user._id);
          sessionStorage.setItem('name', data.user.name);
          sessionStorage.setItem('avatar', data.user.avatar);
          sessionStorage.setItem('address', data.user.address);
          sessionStorage.setItem('coins', data.user.coins);
          window.location.href = '/' + data.user.address;
        } else if (data.user.name) {
          if (data.user.emailActivated) {
            $('#email-validation-msg').text('Your spot has been reserved.');
          }
          $('#waitlist-step').addClass('d-flex').removeClass('d-none');
        } else {
          $('#name-input-step').addClass('d-flex').removeClass('d-none');
        }
      } else if (data.fail_email || data.fail_password) {
        // $.notify('Incorrect email or password', {
        //   type: 'danger'
        // })
      }
      // else if (data.fail_password) {
      //   $('#invalid-password-msg').removeClass('d-none');
      //   $('#wrong-password-emoji').show();
      // }
    }
  });
});

$('#go-to-signup').click(function () {
  $('#btn-signin').hide();
  $('#go-to-signup').hide();
  $('#btn-signup').show();
  $('#password-confirmation').parent().removeClass('d-none').addClass('d-flex');
  $('#waitlistBody h5').text('Create an account');
});

$('#btn-signup').click(function () {
  email = $('#email').val();
  password = $('#password').val();
  if (!email || !password) {
    $.notify('Invalid email or password', {
      type: 'danger'
    });
    return;
  }
  if (emailValidator.test(email)) {
    $('#invalid-email-msg').addClass('d-none');
  } else {
    $('#invalid-email-msg').removeClass('d-none');
    return;
  }
  if (!password || password != $('#password-confirmation').val()) {
    $('#invalid-confirmation-msg').removeClass('d-none');
    return;
  } else {
    $('#invalid-confirmation-msg').addClass('d-none');
  }
  $.ajax({
    url: 'sign-up',
    type: 'post',
    dataType: 'json',
    data: {
      email: email,
      password: password,
    },
    success: function (data) {
      if (data.exist) {
        $('#account-exist-msg').removeClass('d-none');
      } else {
        mixpanel.alias(data.email);
        userInfo = data;
        Cookies.set('swiddle_email', data.email, { expires: 5 });
        Cookies.set('swiddle_token', data.token, { expires: 5 });
        $('#waitlistBody').addClass('d-none').removeClass('d-flex');
        $('#snap-login-step').addClass('d-flex').removeClass('d-none');
      }
    }
  });
});

//Continue button
$('#signup-submit').click(function() {
  // $('#signup-form').submit();
  $('#snap-login-step').removeClass('d-none');
  $('#waitlistBody').addClass('d-none');
});

$('#signin-submit').click(function() {
  $('#signin-form').submit();
});

$('#signup-form').submit(function() {
  displayName = $('#signup-name').val();
  email = $('#signup-email').val();
  password = $('#signup-password').val();
  if (!displayName || !email || !password) {
    $.notify('All the fields are required', {
      type: 'danger'
    });
    return false;
  }
  if (!emailValidator.test(email)) {
    $.notify("Invalid email", {
      type: 'danger'
    });
    return false;
  }
  if (!password || password != $('#signup-password-confirmation').val()) {
    $.notify("Passwords do not match", {
      type: 'danger'
    });
  }
  $.ajax({
    url: 'new-sign-up',
    type: 'post',
    dataType: 'json',
    data: {
      name: displayName,
      email: email,
      password: password,
      avatar: avatar,
      timeZone: timeZone,
      path: window.location.pathname
    },
    success: function (data) {
      if (data.exist) {
        $.notify('Email is taken', {
          type: 'danger'
        });
      } else {
        userInfo = data;
        $.notify('Welcome to Only Friends!', {
          type: 'success'
        });
        mixpanel.alias(data.email);
        Cookies.set('swiddle_email', data.email, { expires: 5 });
        Cookies.set('swiddle_token', data.token, { expires: 5 });
        autoLogin();
      }
    }
  });
  return false;
});

$('#signin-form').submit(function() {
  email = $('#email').val();
  password = $('#password').val();
  if (!email || !password) {
    // $.notify('Incorrect email or password', {
    //   type: 'danger'
    // });
    return false;
  }
  if (!emailValidator.test(email)) {
    // $.notify("Invalid email", {
    //   type: 'danger'
    // });
    return false;
  }
  $.ajax({
    url: '/login',
    type: 'post',
    dataType: 'json',
    data: {
      email: email,
      password: password,
      timeZone: timeZone
    },
    success: function (data) {
      if (data.success) {
        Cookies.set('swiddle_email', data.user.email, { expires: 5 });
        Cookies.set('swiddle_token', data.user.token, { expires: 5 });
        mixpanel.identify(data.user.email);
        if (data.user.access || data.user.invitedBy) {
          // sessionStorage.setItem('loggedIn', true);
          sessionStorage.setItem('id', data.user._id);
          sessionStorage.setItem('name', data.user.name);
          sessionStorage.setItem('avatar', data.user.avatar);
          sessionStorage.setItem('address', data.user.address);
          sessionStorage.setItem('coins', data.user.coins);
          console.log(sessionStorage);
          window.location.href = '/' + data.user.address;
        } else if (data.user.name) {
          if (data.user.emailActivated) {
            $('#email-validation-msg').text('Your spot has been reserved.');
          }
          window.location.reload();
          $('#waitlist-step').addClass('d-flex').removeClass('d-none');
        } else {
          $('#name-input-step').addClass('d-flex').removeClass('d-none');
        }
      } else if (data.fail_email) {
        // $.notify('Incorrect email', {
        //   type: 'danger'
        // })
      }
      else if (data.fail_password) {
        // $.notify('Incorrect password', {
        //   type: 'danger'
        // })
      }
    }
  });
  return false;
});
