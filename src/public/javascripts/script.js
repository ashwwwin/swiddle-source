var speechEvents = {};
var twilioToken, twilioRooms = {};
var videoRoomNames = [],
  remainDisconnects = [];

if (!desktopApp && !Video.isSupported) {
  $.notify('This browser is not supported by twilio-video.js', {
    type: 'danger'
  });
  logout();
} else {
  game = new Phaser.Game(config);
}

//Initializing mic & camera cookie settings
var enableAudio = false;
var enableVideo = false;


//Checking if camera was left enabled from last sessions, if yes then enable it
if (Cookies.get('enable_video')) {
  Cookies.set('enable_video', true, {
    expires: 5
  });
  $('#switch-video').addClass('fa-video').removeClass('fa-video-slash');
  enableVideo = true;
}

//Checking if mic was left enabled from last sessions, if yes then enable it
if (Cookies.get('enable_audio')) {
  Cookies.set('enable_audio', true, {
    expires: 5
  });
  enableAudio = true;
}


//What is this used for?
checkCameraMic = function() {
  //Monkeypatch for crossbrowser geusermedia
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  //Request mic & camera
  navigator.getUserMedia({
    audio: true,
    video: true
  }, function() {
    if (userInfo.guideState == 'finish') {
      $('#welcome-guide-modal').modal('hide');
      if (enableVideo) {
        openMyVideo();
      }
    }
  }, function() {
    $('#switch-video').addClass('fa-video-slash').removeClass('fa-video');
    $('#switch-audio').addClass('fa-microphone-slash').removeClass('fa-microphone');
  });
}

$('#switch-audio').click(function() {
  enableAudio = !enableAudio;
  Cookies.set('enable_audio', enableAudio || '', {
    expires: 5
  });
  if (enableAudio) {
    openMyAudio();
  } else {
    $(this).removeClass('fa-microphone').addClass('fa-microphone-slash');
    for (roomName in twilioRooms) {
      twilioRooms[roomName].localParticipant?.audioTracks.forEach(publication => {
        publication.track.stop();
        publication.unpublish();
      });
    }
    removeHarkEvent(ownId);
  }
});

$('#switch-video').click(function() {
  if (!enableVideo) {

    Video.createLocalVideoTrack({
      height: 720,
      frameRate: 24,
      width: 1280
    }).then(localVideoTrack => {
      window.localVideoTrack = localVideoTrack;
      var roomsExist = false;
      for (roomName in twilioRooms) {
        roomsExist = true;
        twilioRooms[roomName].localParticipant.publishTrack(localVideoTrack);
      }
      if (!roomsExist) {
        const $media = $(`#${ownId} video`);
        localVideoTrack.attach($media.get(0));
        $(`#${ownId}`).removeClass('d-none');
      }
      $('#switch-video').addClass('fa-video').removeClass('fa-video-slash');
      enableVideo = true;
      Cookies.set('enable_video', enableVideo || '', {
        expires: 5
      });

      initFullScreenVideoMode();
    }, _err => {
      $('#switch-video').addClass('fa-video-slash').removeClass('fa-video');
    });
  } else {
    var roomsExist = false;
    for (roomName in twilioRooms) {
      roomsExist = true;
      twilioRooms[roomName].localParticipant?.videoTracks.forEach(publication => {
        publication.track.stop();
        publication.unpublish();
      });
    }
    if (!roomsExist) {
      window.localVideoTrack?.stop();
    }

    $(this).removeClass('fa-video').addClass('fa-video-slash');
    $(`#${ownId}`).addClass('d-none');
    enableVideo = false;
    Cookies.set('enable_video', enableVideo || '', {
      expires: 5
    });

    initFullScreenVideoMode();
  }
});


function openMyAudio() {
  $('#switch-audio').show();
  enableAudio = !!Cookies.get('enable_audio');
  if (enableAudio) {
    $('#switch-audio').addClass('fa-microphone').removeClass('fa-microphone-slash');
    Video.createLocalAudioTrack().then(localAudioTrack => {
      window.localAudioTrack = localAudioTrack;

      for (roomName in twilioRooms) {
        twilioRooms[roomName].localParticipant?.publishTrack(localAudioTrack);
      }
      setHarkEvent(ownId, localAudioTrack);

    }, _err => {
      $('#switch-audio').addClass('fa-microphone-slash').removeClass('fa-microphone');
    });
  }
}

openMyVideo = function() {
  $('#switch-video').show();
  enableVideo = !!Cookies.get('enable_video');
  if (enableVideo) {
    if (!window.localVideoTrack) {
      if (!hasWebcam) {
        $('#switch-video').addClass('fa-video-slash').removeClass('fa-video');
        return;
      }
      if (!isWebcamAlreadyCaptured) {
        $('#switch-video').addClass('fa-video-slash').removeClass('fa-video');
        return;
      }
      Video.createLocalVideoTrack({
        height: 720,
        frameRate: 24,
        width: 1280
      }).then(localVideoTrack => {
        window.localVideoTrack = localVideoTrack;
        const $media = $(`#${ownId} video`);
        localVideoTrack.attach($media.get(0));
      }, _err => {
        $('#switch-video').addClass('fa-video-slash').removeClass('fa-video');
      });
    } else if (window.localVideoTrack.isStopped) {
      window.localVideoTrack.restart();
    }
    $(`#${ownId}`).removeClass('d-none');
  }
}

disableMyVideo = function() {
  enableVideo = false;
  // enableAudio = false;
  $('#switch-video').hide();
  // $('#switch-audio').hide();
  $(`#${ownId}`).addClass('d-none');

  var roomsExist = false;
  for (roomName in twilioRooms) {
    roomsExist = true;
    twilioRooms[roomName].disconnect();
    // twilioRooms[roomName].localParticipant?.videoTracks.forEach(publication => {
    //   publication.track.stop();
    //   publication.unpublish();
    // });
  }
  if (!roomsExist) {
    window.localVideoTrack?.stop();
  }
  // window.localAudioTrack?.stop();
  // removeHarkEvent(ownId);
}

function connectVideoRoom(roomName) {
  if (sceneName != 'home') {
    return;
  }

  pioneerAnalytics.active();
  roomName = `${serverId}-${roomId}-${roomName}`;

  if (videoRoomNames.includes(roomName)) {
    return;
  }
  videoRoomNames.push(roomName);
  joinTwilioRoom(twilioToken, {
    name: roomName,
    audio: enableAudio,
    video: enableVideo ? {
      height: 720,
      frameRate: 24,
      width: 1280
    } : false,
  });
}

function disconnectVideoRoom(roomName) {
  roomName = `${serverId}-${roomId}-${roomName}`;

  const index = videoRoomNames.indexOf(roomName);
  if (index != -1) videoRoomNames.splice(index, 1);

  if (twilioRooms[roomName]) {
    twilioRooms[roomName].disconnect();
  } else if (index != -1 && !remainDisconnects.includes(roomName)) {
    remainDisconnects.push(roomName);
  }
}

function disconnectAllVideoRoom() {
  for (roomName in twilioRooms) {
    twilioRooms[roomName].disconnect();

    const index = videoRoomNames.indexOf(roomName);
    if (index != -1) videoRoomNames.splice(index, 1);
  }

  remainDisconnects.concat(videoRoomNames);
  videoRoomNames = [];
}

function setHarkEvent(playerId, audioTrack) {
  const stream = new MediaStream([audioTrack.mediaStreamTrack]);

  if (speechEvents[playerId]) {
    speechEvents[playerId].stop();
  }
  speechEvents[playerId] = hark(stream, {});
  speechEvents[playerId].on('speaking', function() {
    $(`#${playerId}`).find('.peer-name').addClass('normal-blue');
    containerList[playerId]?.getAt(1)?.setVisible(true);
  });
  speechEvents[playerId].on('stopped_speaking', function() {
    $(`#${playerId}`).find('.peer-name').removeClass('normal-blue');
    containerList[playerId]?.getAt(1)?.setVisible(false);
  });
}

function removeHarkEvent(playerId) {
  if (speechEvents[playerId]) {
    speechEvents[playerId].stop();
  }
}