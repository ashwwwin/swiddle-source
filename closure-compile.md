<!-- These are commands for compile javascript files -->

google-closure-compiler dist/original/analytics.js --js_output_file dist/public/javascripts/analytics.js

google-closure-compiler dist/original/login-signup.js dist/original/snapkit-login.js --js_output_file dist/public/javascripts/login-signup.js

google-closure-compiler dist/original/reset-password.js --js_output_file dist/public/javascripts/reset-password.js

google-closure-compiler dist/original/landing/index.js dist/original/landing/login-signup.js dist/original/crypto.js dist/original/snapkit-login.js dist/original/notifications.js --js_output_file dist/public/javascripts/landing-login-signup.js

google-closure-compiler dist/original/snapkit-login.js dist/original/confetti.js dist/original/check-media-device.js dist/original/twilio.js dist/original/game.js dist/original/who-is.js dist/original/doodly.js dist/original/against-humanity.js dist/original/love-hate.js dist/original/guess-who.js dist/original/codename.js dist/original/socket.js dist/original/play.js dist/original/script.js dist/original/welcome-guide.js dist/original/ytvideo.js dist/original/friends.js dist/original/room-explore.js dist/original/events.js dist/original/coin.js dist/original/coin-gifts.js dist/original/home-designer.js dist/original/pathfind.js dist/original/loading.js dist/original/lipoker.js dist/original/richup.js dist/original/rewards.js dist/original/payments.js dist/original/whack-a-mole.js dist/original/user-settings.js --js_output_file dist/public/javascripts/play.js

google-closure-compiler dist/original/notifications.js --js_output_file dist/public/javascripts/notifications.js