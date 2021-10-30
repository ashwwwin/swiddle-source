$('#btn-reset-password').click(function () {
  if (!$('#password').val()) {
    return;
  }
  $.ajax({
    url: window.location.href,
    type: 'post',
    dataType: 'json',
    data: {
      password: $('#password').val()
    },
    success: function (data) {
      if (data.success) {
        Cookies.set('swiddle_email', data.user.email, { expires: 5 });
        Cookies.set('swiddle_token', data.user.token, { expires: 5 });
        if (data.user.access || data.user.invitedBy) {
          // sessionStorage.setItem('loggedIn', true);
          sessionStorage.setItem('id', data.user._id);
          sessionStorage.setItem('name', data.user.name);
          sessionStorage.setItem('avatar', data.user.avatar);
          sessionStorage.setItem('address', data.user.address);
          sessionStorage.setItem('coins', data.user.coins);
          window.location.href = '/' + data.user.address;
        }
      }
      window.location.href = '/'
    }
  });
});