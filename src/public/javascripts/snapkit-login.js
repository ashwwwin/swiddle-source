if (window.location.pathname == '/' || window.location.pathname == '/simple') {
  // Change snapkit login buttton text
  var mutationObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      a = mutation.target;
      if (mutation.target.id == 'snapkit-login-button-target') {
        $('#snapkit-login-button-target span').text('Link with Snap');
      } else if (mutation.target.normalizedNodeName == 'button') {
        if (mutation.addedNodes.length) {
          $('#snapkit-login-button-target button').removeClass('background-center');
          $('#snapkit-login-button-target span').text('Link with Snap');
        } else {
          $('#snapkit-login-button-target button').addClass('background-center');
        }
      }
    });
  });
  mutationObserver.observe(document.getElementById('snapkit-login-button-target'), {
    childList: true,
    subtree: true
  });
}

// window.snapKitInit = () => {
//   snap.loginkit.mountButton("snapkit-login-button-target", {
//     clientId: snapkitClientId,
//     redirectURI: siteUrl,
//     scopeList: [
//       "user.display_name",
//       "user.bitmoji.avatar",
//     ],
//     handleResponseCallback: () => {
//       snap.loginkit.fetchUserInfo().then(data => {
//         snapkitLogin(data),
//         function (err) {
//           console.log(err); // Error
//         }
//       })
//     },
//   })
// }

// window.snapKitInit = function () {
//   // Mount Login Button
//   snap.loginkit.mountButton("snapkit-login-button-target", {
//     clientId: snapkitClientId,
//     redirectURI: siteUrl,
//     scopeList: [
//       "user.display_name",
//       "user.bitmoji.avatar",
//       "user.external_id",
//     ],
//     handleResponseCallback: function () {
//       snap.loginkit.fetchUserInfo().then(
//         snapkitLogin,
//         function (err) {
//           console.log(err); // Error
//         }
//       );
//     },
//   });
// };

function snapkitLogin(result) {
  if (window.location.pathname == '/' || window.location.pathname == '/simple') {
    $.ajax({
      url: 'finish-signup',
      type: 'post',
      dataType: 'json',
      data: {
        id: userInfo._id,
        name: result.data.me.displayName,
        avatar: result.data.me.bitmoji.avatar,
        path: window.location.pathname,
        email: $('#email').val(),
        timeZone: timeZone,
      },
      success: function (data) {
        $('#snap-login-step').addClass('d-none').removeClass('d-flex');
        $('#waitlist-step').removeClass('d-none').addClass('d-flex');
        Cookies.set('swiddle_email', email, { expires: 5 });
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
      }
    });
  } else {
    $.ajax({
      url: "update-bitmoji",
      type: "post",
      dataType: "json",
      data: {
        id: ownId,
        name: result.data.me.displayName,
        avatar: result.data.me.bitmoji.avatar,
      },
      success: function () {
        sendMessage({
          type: 'update-bitmoji',
          data: ownId,
        });
      }
    });
  }
}

// Load the SDK asynchronously
(function (d, s, id) {
  var js,
    sjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s);
  js.id = id;
  js.src = "https://sdk.snapkit.com/js/v1/login.js";
  sjs.parentNode.insertBefore(js, sjs);
})(document, "script", "loginkit-sdk");