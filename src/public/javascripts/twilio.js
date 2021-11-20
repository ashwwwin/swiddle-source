const Video = Twilio.Video;
const { Logger } = Video;
const logger = Logger.getLogger('twilio-video');
logger.setLevel('debug');

/**
 * Set the VideoTrack priority for the given RemoteParticipant. This has no
 * effect in Peer-to-Peer Rooms.
 * @param participant - the RemoteParticipant whose VideoTrack priority is to be set
 * @param priority - null | 'low' | 'standard' | 'high'
 */
function setVideoPriority(participant, priority) {
  participant.videoTracks.forEach(publication => {
    const track = publication.track;
    if (track && track.setPriority) {
      track.setPriority(priority);
    }
  });
}

/**
 * Attach a Track to the DOM.
 * @param track - the Track to attach
 * @param participant - the Participant which published the Track
 */
function attachTrack(track, participant) {
  if (sceneName != 'home') {
    return;
  }
  
  // Attach the Participant's Track to the thumbnail.
  const $media = $(`#${participant.identity} ${track.kind}`);
  track.attach($media.get(0));

  if (track.kind == 'video') {
    $(`#${participant.identity}`).removeClass('d-none');

    if (participant.identity == ownId) {
      window.localVideoTrack = track;
    }

    initFullScreenVideoMode();
  } else if (track.kind == 'audio') {
    setHarkEvent(participant.identity, track);
  }
}

/**
 * Detach a Track from the DOM.
 * @param track - the Track to be detached
 * @param participant - the Participant that is publishing the Track
 */
function detachTrack(track, participant) {
  // Detach the Participant's Track from the thumbnail.
  const $media = $(`#${participant.identity} ${track.kind}`);
  track.detach($media.get(0));

  if (track.kind == 'video') {
    $(`#${participant.identity}`).addClass('d-none');

    initFullScreenVideoMode();
  } else if (track.kind == 'audio') {
    removeHarkEvent(participant.identity);
  }
}

/**
 * Handle the Participant's media.
 * @param participant - the Participant
 * @param room - the Room that the Participant joined
 */
function participantConnected(participant, room) {
  // Handle the TrackPublications already published by the Participant.
  participant.tracks.forEach(publication => {
    trackPublished(publication, participant);
  });

  // Handle theTrackPublications that will be published by the Participant later.
  participant.on('trackPublished', publication => {
    trackPublished(publication, participant);
  });
}

/**
 * Handle a disconnected Participant.
 * @param participant - the disconnected Participant
 * @param room - the Room that the Participant disconnected from
 */
function participantDisconnected(participant, room) {
  // Hide the Participant's media container.
  $(`#${participant.identity}`).addClass('d-none');
}

/**
 * Handle to the TrackPublication's media.
 * @param publication - the TrackPublication
 * @param participant - the publishing Participant
 */
function trackPublished(publication, participant) {
  // If the TrackPublication is already subscribed to, then attach the Track to the DOM.
  if (publication.track) {
    attachTrack(publication.track, participant);
  }

  // Once the TrackPublication is subscribed to, attach the Track to the DOM.
  publication.on('subscribed', track => {
    attachTrack(track, participant);
  });

  // Once the TrackPublication is unsubscribed from, detach the Track from the DOM.
  publication.on('unsubscribed', track => {
    detachTrack(track, participant);
  });
}

/**
 * Join a Room.
 * @param token - the AccessToken used to join a Room
 * @param connectOptions - the ConnectOptions used to join a Room
 */
async function joinTwilioRoom(token, connectOptions) {
  if (!token || videoRoomNames[connectOptions.name] || sceneName != 'home') {
    return;
  }

  connectOptions.bandwidthProfile = {
    video: {
      mode: 'grid'
    }
  };
  connectOptions.maxAudioBitrate = 16000;
  connectOptions.preferredVideoCodecs = [{ codec: 'VP8', simulcast: true }];
  connectOptions.networkQuality = {local: 1, remote: 1};

  // Join to the Room with the given AccessToken and ConnectOptions.
  const room = await Video.connect(token, connectOptions);
  if (remainDisconnects.includes(room.name)) {
    const index = remainDisconnects.indexOf(room.name);
    if (index != -1) remainDisconnects.splice(index, 1);
    room.disconnect();
    return;
  }

  // Set Volumes to 1
  if (connectOptions.name.endsWith('-table')) {
    room.participants.forEach(participant => {
      setVolume(participant.identity, 1, 1);
    });
  }

  if (!window.localVideoTrack || window.localVideoTrack.isStopped) {
    // Save the LocalVideoTrack.
    if (room.localParticipant.videoTracks.size) {
      window.localVideoTrack = Array.from(room.localParticipant.videoTracks.values())[0].track;
    }

    // Handle the LocalParticipant's media.
    participantConnected(room.localParticipant, room);
  }

  // Make the Room available in the JavaScript console for debugging.
  twilioRooms[room.name] = room;

  // Subscribe to the media published by RemoteParticipants already in the Room.
  room.participants.forEach(participant => {
    participantConnected(participant, room);
  });

  // Subscribe to the media published by RemoteParticipants joining the Room later.
  room.on('participantConnected', participant => {

    mixpanel.track('Video Connected', {
      'ownId': ownId,
      'videoRoomName': room.sid
    });

    participantConnected(participant, room);
  });

  // Handle a disconnected RemoteParticipant.
  room.on('participantDisconnected', participant => {
    participantDisconnected(participant, room);

    if (!room.participants.size) {
      room.disconnect();
      const index = videoRoomNames.indexOf(room.name);
      if (index != -1) videoRoomNames.splice(index, 1);
      return;
    }
  });

  room.once('disconnected', (room, error) => {
    // Handle the disconnected RemoteParticipants.
    room.participants.forEach(participant => {
      participantDisconnected(participant, room);
    });

    // Clear the Room reference used for debugging from the JavaScript console.
    delete twilioRooms[room.name];

    // if (!videoRoomNames.length) {
    //   window.localAudioTrack?.stop();
    //   removeHarkEvent(ownId);
    // }
  });
}


// Leave the Room when the "beforeunload" event is fired.
window.onbeforeunload = (e) => {
  disconnectAllVideoRoom();

  // Clear loggedIn session
  // sessionStorage.setItem('loggedIn', '');
};

if (isMobile()) {
  // TODO(mmalavalli): investigate why "pagehide" is not working in iOS Safari.
  // In iOS Safari, "beforeunload" is not fired, so use "pagehide" instead.
  window.onpagehide = () => {
    disconnectAllVideoRoom();

  };

  // On mobile browsers, use "visibilitychange" event to determine when
  // the app is backgrounded or foregrounded.
  document.onvisibilitychange = async () => {
    if (document.visibilityState === 'hidden') {
      // When the app is backgrounded, your app can no longer capture
      // video frames. So, stop and unpublish the LocalVideoTrack.
      localVideoTrack.stop();
      for (roomName in twilioRooms) {
        twilioRooms[roomName].localParticipant?.unpublishTrack(localVideoTrack);
      }
    } else if (Object.keys(twilioRooms).length && enableVideo) {
      // When the app is foregrounded, your app can now continue to
      // capture video frames. So, publish a new LocalVideoTrack.
      localVideoTrack = await createLocalVideoTrack(connectOptions.video);
      for (roomName in twilioRooms) {
        twilioRooms[roomName].localParticipant?.publishTrack(localVideoTrack);
      }
    }
  };
}

function isMobile() {
  if (typeof navigator === 'undefined' || typeof navigator.userAgent !== 'string') {
    return false;
  }
  return /Mobile/.test(navigator.userAgent);
}