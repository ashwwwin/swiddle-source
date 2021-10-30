var searchKeys = [];
var playingVideo = false;

var tag = document.createElement('script');

//Loads YT API
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

//Initializes the YT video
var ytvideo;
function onYouTubeIframeAPIReady() {
  ytvideo = new YT.Player('ytvideo', {
    height: '345',
    width: '768',
    playerVars: {
      'playsinline': 1,
      'controls': 0
    }
  });
}

//Tells the backend to search for yt videos
function searchYT() {
  searchKeys.push($('#search-video-input').val());
  sendMessage({
    type: 'search-video',
    data: $('#search-video-input').val()
  });
  //Clears the video list
  $('#video-list').html('');

  mixpanel.track('Video Search', {
    'ownId': ownId,
    data: $('#search-video-input').val()
  });
}

$('#search-video-input').keypress(function (e) {
  if (e.keyCode != 13 || !$(this).val() || searchKeys.includes($('#search-video-input').val())) {
    return;
  }
  searchYT();
});

$('#search-video').click(function () {
  if (!$('#search-video-input').val() || searchKeys.includes($('#search-video-input').val())) {
    return;
  }
  searchYT();
});

$('#video-list').on('click', '.video-item:not(.active)', function () {
  mixpanel.track('Play Video', {
    'ownId': ownId
  });

  sendMessage({
    type: 'select-video',
    data: $(this).data('yid')
  });
});

$('#allow-guest-play').change(function () {
  if (isHomeOwner) {
    sendMessage({
      type: 'guest-can-play-song',
      data: $(this).prop('checked')
    });
  }
});

$('#play-pause-video').click(function () {
  if ($(this).hasClass('fa-pause-circle')) {
    $('#play-pause-video').addClass('fa-play-circle').removeClass('fa-pause-circle');
    sendMessage({
      type: 'play-pause-video',
      data: false
    });
  } else {
    $('#play-pause-video').removeClass('fa-play-circle').addClass('fa-pause-circle');
    sendMessage({
      type: 'play-pause-video',
      data: true
    });
  }
});

//Gets 'val' from the backend and decides whether to play or pause
function playPauseVideo(val){
  if (val) {
    ytPlay();
  } else {
    ytPause();
  }
}

//Initializes the selected video & plays it
function selectedVideo(data) {
  $('.video-item.active').removeClass('active');
  $(`.video-item[data-yid=${data}]`).addClass('active');
  ytvideo?.loadVideoById(data);
  $('#play-pause-video').removeClass('fa-play-circle').addClass('fa-pause-circle');
}

//Controls guest being able to play video
function guestCanPlayVideo(val) {
  if (isHomeOwner) {
    return;
  }
  if (val) {
    $('#video-control-container').show().parents('.modal-dialog').css({
      width: 970,
      maxWidth: 970,
    });
  } else {
    $('#video-control-container').hide().parents('.modal-dialog').css({
      width: 690,
      maxWidth: 690,
    });
  }
}

//Adds results to the video list
function addVideo(result) {
  var $item = $('<div class="video-item d-flex justify-content-between align-items-center"><span class="video-title"></span></div>').attr('data-yid', result.yid);
  $item.find('.video-title').text(result.title);
  $item.appendTo('#video-list');
}

//Changes the volume
function ytChangeVolume (value) {
  ytvideo?.setVolume(value);
  Cookies.set('swiddle_volume', value, { expires: 5 });
}

//Opens the YT Modal
$('#ytVideoToggle').click(function () {
  if (friendListOpen == true) {
    $('#friend-list').click();
  }
  $('#video-play-modal').modal('show');
  return;
});

//Plays the yt video
function ytPlay() {
  ytvideo?.playVideo();
}

//Pauses the yt video
function ytPause() {
  ytvideo?.pauseVideo();
}

//Closes the YT Modal
function ytClose() {
  $('#video-play-modal').modal('hide');
  return;
}