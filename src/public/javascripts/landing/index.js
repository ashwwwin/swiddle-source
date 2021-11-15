if (window.location.pathname == 'sign-in') {
  autoLogin();
}

var emailValidator = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

var timeZone = (Intl.DateTimeFormat().resolvedOptions().timeZone);

// $(function () {
//   //Added tooltip
//   $('body').tooltip({
//     selector: '[data-toggle="tooltip"]'
//   });

//   $.notifyDefaults({
//     allow_dismiss: false,
//     delay: 5000,
//     placement: {
//       from: 'bottom',
//       align: 'center'
//     },
//     offset: {
//       y: 50
//     },
//     z_index: 1400,
//     onClick: function (e) {
//       $.notifyClose(e.$ele);
//     },
//     template: `
//       <div data-notify="container" class="col-xs-11 col-sm-4 col-md-3 text-center alert alert-{0}" role="alert">
//         <button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>
//         <span data-notify="icon"></span>
//         <span data-notify="title">{1}</span>
//         <span data-notify="message">{2}</span>
//         <div class="progress" data-notify="progressbar">
//           <div class="progress-bar progress-bar-{0}" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>
//         </div>
//         <a href="{3}" target="{4}" data-notify="url"></a>
//       </div>
//     `
//   });
// });

$('.toggle-password-display').click(function () {
  if ($(this).hasClass('fa-eye')) {
    $('.fa-eye').removeClass('fa-eye').addClass('fa-eye-slash');
    $('.toggle-password-display').siblings('input').attr('type', 'password');
  } else {
    $('.fa-eye-slash').addClass('fa-eye').removeClass('fa-eye-slash');
    $('.toggle-password-display').siblings('input').attr('type', 'text');
  }
});

$('#change-snapkit').click(function () {
  $('#snapkit-login-button-target button').click();
  return false;
});

function autoLogin() {
  // Check cookie and auto login
  var email = Cookies.get('swiddle_email');
  var token = Cookies.get('swiddle_token');
  // var loggedIn = sessionStorage.getItem('logged_in');
  if (email && token){ //!loggedIn) {
    $.ajax({
      url: '/auto-login',
      type: 'post',
      dataType: 'json',
      data: {
        token: token,
        email: email,
        timeZone: timeZone,
      },
      success: function (data) {
        console.log(data);
        if (data.success) {
          userInfo = data.user;
          console.log(userInfo);
          Cookies.set('swiddle_email', data.user.email, { expires: 5 });
          Cookies.set('swiddle_token', data.user.token, { expires: 5 });
          mixpanel.identify(data.user.email);
          if (data.user.access || data.user.invitedBy) {
            // sessionStorage.setItem('loggedIn', true);
            console.log(data.user);
            sessionStorage.setItem('id', data.user._id);
            sessionStorage.setItem('name', data.user.name);
            sessionStorage.setItem('avatar', data.user.avatar || '');
            sessionStorage.setItem('address', data.user.address);
            sessionStorage.setItem('coins', data.user.coins);
            if (window.location.pathname == '/sign-in') {
              window.location.href = '/' + data.user.address;
            } else {
              personData.id = sessionStorage.getItem('id');
              personData.name = sessionStorage.getItem('name');
              personData.avatar = sessionStorage.getItem('avatar');
              ownId = personData.id;
              // isHomeOwner = (homeOwner._id == ownId);
              window.location.href = '/' + data.user.address;
              // if (data.user.address == ownId) {
              //   enterHomeAction();
              // }
            }
          } else if (data.user.name) {
            $('#waitlistBody').addClass('d-none').removeClass('d-flex');
            $('#waitlist-step').addClass('d-flex').removeClass('d-none');
            if (data.user.emailActivated) {
              $('#email-validation-msg').text('Your spot has been reserved.');
            }
          } else {
            $('#waitlistBody').addClass('d-none').removeClass('d-flex');
            $('#snap-login-step').addClass('d-flex').removeClass('d-none');
          }
        } else {
          Cookies.set('swiddle_email', false, { expires: -1 });
          Cookies.set('swiddle_token', false, { expires: -1 });
        }
      }
    });
  }
}
