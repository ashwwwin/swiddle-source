var email;
var displayName;
var userInfo = {};
var personData = {};
var avatar;
var homeOwner;

var emailValidator = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
var addressValidator = /^[a-zA-Z0-9]+$/i;
var timeZone = (Intl.DateTimeFormat().resolvedOptions().timeZone);

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

$('#btn-signin').click(function () {
  email = $('#email').val();
  password = $('#password').val();
  if (!email || !password) {
    showNotification('error','Please fill in all the fields');
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
        showNotification('error','Incorrect email or password');
      }
      else if (data.fail_password) {
        showNotification('error','Incorrect password');
      }
    }
  });
});


// $('#signin-submit').click(function() {
//   $('#signin-form').submit();
// });

$('#signup-form').submit(function() {
  displayName = $('#signup-name').val();
  displayName = 'Default';
  email = $('#signup-email').val();
  password = $('#signup-password').val();
  if (!displayName || !email || !password) {
    showNotification('error','All the fields are required');
    return false;
  }
  if (!emailValidator.test(email)) {
    showNotification('error','Invalid email');
    return false;
  }
  if (!password || password != $('#signup-password-confirmation').val()) {
    showNotification('error','Passwords do not match');
  }
  $.ajax({
    url: 'new-sign-up',
    type: 'post',
    dataType: 'json',
    data: {
      name: displayName,
      email: email,
      password: password,
      timeZone: timeZone,
    },
    success: function (data) {
      if (data.exist) {
        showNotification('error','Email is taken');
      } else {
        userInfo = data;
        mixpanel.alias(data.email);
        Cookies.set('swiddle_email', data.email, { expires: 5 });
        Cookies.set('swiddle_token', data.token, { expires: 5 });
        autoLogin();
      }
    }
  });
  return false;
});

// $('#signin-form').submit(function() {
//   email = $('#email').val();
//   password = $('#password').val();
//   if (!email || !password) {
//     showNotification('error','Please fill in all the fields');
//     return false;
//   }
//   if (!emailValidator.test(email)) {
//     showNotification('error','Invalid email');
//     return false;
//   }
//   $.ajax({
//     url: '/login',
//     type: 'post',
//     dataType: 'json',
//     data: {
//       email: email,
//       password: password,
//       timeZone: timeZone
//     },
//     success: function (data) {
//       if (data.success) {
//         Cookies.set('swiddle_email', data.user.email, { expires: 5 });
//         Cookies.set('swiddle_token', data.user.token, { expires: 5 });
//         mixpanel.identify(data.user.email);
//         if (data.user.access || data.user.invitedBy) {
//           // sessionStorage.setItem('loggedIn', true);
//           sessionStorage.setItem('id', data.user._id);
//           sessionStorage.setItem('name', data.user.name);
//           sessionStorage.setItem('avatar', data.user.avatar);
//           sessionStorage.setItem('address', data.user.address);
//           sessionStorage.setItem('coins', data.user.coins);
//           console.log(sessionStorage);
//           window.location.href = '/' + data.user.address;
//         } else if (data.user.name) {
//           if (data.user.emailActivated) {
//             $('#email-validation-msg').text('Your spot has been reserved.');
//           }
//           window.location.reload();
//           $('#waitlist-step').addClass('d-flex').removeClass('d-none');
//         } else {
//           $('#name-input-step').addClass('d-flex').removeClass('d-none');
//         }
//       } else if (data.fail_email) {
//         showNotification('error','Incorrect email');
//       }
//       else if (data.fail_password) {
//         showNotification('error','Incorrect password');
//       }
//     }
//   });
//   return false;
// });
