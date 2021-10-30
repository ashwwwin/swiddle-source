var selectedEventInvites = []

currentTime = new Date();
currentMonth = currentTime.getMonth();
currentDate = currentTime.getDate();
currentYear = currentTime.getFullYear();

//Function to convert timezone
function convertTZ(date, tzString) {
    if (!tzString) {
        tzString = timeZone
    }
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", {timeZone: tzString}));   
}

function loadMyEvents() {
    sendMessage({
        type: 'get-events'
    });
}


function openEvents() {
    //Opens the events modal
    $('#events-modal').modal('show');

    //Sets placeholder to today
    $('#create-event-date').attr('placeholder', currentDate);
    $('#create-event-month').val(`${currentMonth}`);
    $('#create-event-year').attr('placeholder', currentYear);
}

function openEventCreator() {
    //Shows create event header & hides all events header
    $('#create-event-header').removeClass('d-none');
    $('#all-events-header').addClass('d-none');

    //Shows the create event container and hides the upcoming events container
    $('#create-event-container').removeClass('d-none');
    $('#upcoming-events-container').addClass('d-none');
}

function openAllEvents() {
    //Shows all events header & hides create events header
    $('#all-events-header').removeClass('d-none');
    $('#create-event-header').addClass('d-none');
    $('#event-details-header').addClass('d-none');

    //Hides the create event container and shows the upcoming events container
    $('#create-event-container').addClass('d-none');
    $('#event-details-container').addClass('d-none');
    $('#upcoming-events-container').removeClass('d-none');
}

function createScheduledEvent() {
    //Gets the current time
    var now = new Date();

    //Gets the event name
    var eventName = $('#events-name-input').val();

    //Gets date input
    var scheduleEventDate = $('#create-event-date').val();
    var scheduleEventMonth = $('#create-event-month').val();
    var scheduleEventYear = $('#create-event-year').val();

    //Gets time input
    var scheduleEventTime = $('#events-time-input').val();


    if (eventInvites.length == 0) {
        $.notify('Invite people to your event', {
            type: 'danger',
        });
        return false;
    }

    //Checks that the year and date fields are filled
    if (!scheduleEventDate || !scheduleEventYear || !scheduleEventTime || !eventName) {
        $.notify('Fill in all the fields', {
            type: 'danger',
        });
        return false;
    }

    //Gets hour and minute of the day
    var scheduleEventHour = scheduleEventTime.split(":", 1)[0];
    var scheduleEventMinute = ((scheduleEventTime.split(" ", 2))[0]).split(":", 2)[1];

    //If it's PM then converts the hour into 24 hour format
    var AmPm = ((scheduleEventTime.split(" ", 2))[1]).toUpperCase();
    scheduleEventHour = parseInt(scheduleEventHour);
    //If 12 am then the 24hr version would be 00 for the hour
    if (AmPm == 'AM' && scheduleEventHour == 12) {
        scheduleEventHour = 0;
    } else if (AmPm == 'PM' && scheduleEventHour >= 1 && scheduleEventHour != 12) {
        scheduleEventHour = scheduleEventHour + 12;
    }

    //Converts date and time into a single variable
    var scheduledOn = new Date(scheduleEventYear, scheduleEventMonth, scheduleEventDate, scheduleEventHour, scheduleEventMinute);

    //Checks if the date is filled properly
    if (isNaN(scheduledOn.getTime()) || scheduledOn.getFullYear() != scheduleEventYear || scheduledOn.getMonth() != scheduleEventMonth || scheduledOn.getDate() != scheduleEventDate) {
        $.notify('Invalid date or time', {
            type: 'danger',
        });
        return false;
    }

    if (scheduledOn < now) {
        $.notify("Can't make events in the past", {
            type: 'danger',
        });
        return false;
    }

    $.ajax({
        url: 'create-event',
        type: 'post',
        await: true,
        dataType: 'json',
        data: {
            eventName: eventName,
            eventTime: scheduledOn,
            eventTimeTZ: timeZone,
            eventCreator: ownId,
            eventInvites: eventInvites,
        },
        success: function () {
            $.notify("Event created", {
                type: 'success',
            });
            
            mixpanel.track('Create Event', {
                'ownId': ownId,
                'eventTime': scheduledOn,
                'eventName': eventName
              });

            //Resetting all the entries
            selectedEventInvites = []
            eventName = $('#events-name-input').val('');
            scheduleEventDate = $('#create-event-date').val('');
            scheduleEventMonth = $('#create-event-month').val('');
            scheduleEventYear = $('#create-event-year').val('');
            $('#events-time-input').val('');

            //Shows the upcoming events page 
            loadMyEvents();
            openAllEvents();
        },
        error: function () {
            //When error
        }
    });
}


var eventInvites = [];
function addEventInvite(friendId) {
    var btnString = '#event-invite-item-btn-' + friendId;
    if ($(btnString).text() == 'Invite') {
        //Adding to the user to the invites list
        $(btnString).text('Selected');
        eventInvites.push(friendId);
        
    } else {
        //Removing the user from the invites list
        $(btnString).text('Invite');
        eventInvites = eventInvites.filter(e => e !== friendId);
    }
}

function getEvents(data) {
    var noUpcomingEventsText =  $('#no-upcoming-events-message').clone();
    $('#upcoming-events-list').html('');
    $('#upcoming-events-list').append(noUpcomingEventsText);

    var now = new Date();

    var eventList = data.event;
    var eventsOwnedList = data.eventsOwned;

    //Hides the no upcoming events message if there any events in the events list
    if (eventList.length != 0) {
        $('#no-upcoming-events-message').addClass('d-none');
    }

    var counter = 0;
    while (counter < eventList.length) {
        var currentEv = eventList[counter];

        //Converting timezone lol
        var eventScheduled = convertTZ(currentEv.eventTime);

        //Storing date, time
        var eventHour = eventScheduled.getHours();
        var eventMinute = eventScheduled.getMinutes();
        var eventDate = eventScheduled.getDate();
        var eventMonth = eventScheduled.getMonth();
        var eventYear = eventScheduled.getFullYear();

        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        var monthText = months[eventMonth];
        
        //Making the date pretty
        var eventPrettyDate;
        if (now.getDate() == eventDate && now.getFullYear() == eventYear && now.getMonth() == eventMonth) {
            eventPrettyDate = 'Today';
        } else {
            eventPrettyDate = monthText + ' ' + eventDate + ', ' + eventYear;
        }

        //Deciding whether it is AM or PM
        var AmPm;
        if (eventHour == 0) {
            eventHour = 12;
            AmPm = 'AM';
        } else if (eventHour > 12) {
            eventHour = eventHour - 12;
            AmPm = 'PM'
        } else {
            AmPm = 'AM'
        }

        //Prettifying the minutes
        var eventPrettyTime;
        if (eventMinute == 0) {
            //Deciding whether to show minutes or not
            eventPrettyTime = eventHour + ' ' + AmPm;
        } else {
            if (eventMinute < 10) {
                //If the minute is less than 10 it adds the 0 eg. '09) to the minute, collectively becoming 8:07 pm instead of 8:7pm
                eventMinute = '0' + eventMinute;
            }
            //Merges the time
            eventPrettyTime = eventHour + ':' + eventMinute + ' ' + AmPm;
        }

        //If the event is happening today
        var joinButtonDisplay = '';
        var cursorPointer = '';
        var summaryClick = '';
        if (eventScheduled > now) {
            //If the event has already started then display the join now button
            joinButtonDisplay = 'display: none;';
            cursorPointer = 'cursor: pointer;';
            summaryClick = "openEventDetails('"+ currentEv._id +"')"
        } else if (eventPrettyDate == 'Today') {
            //If it hasn't started then set a timeout to display it
            updateEventDates(eventScheduled, currentEv.eventCreator);
        } 

        $('#upcoming-events-list').append(`
            <div id="event-summary-item-${currentEv._id}" class="justify-content-between mb-2 event-summary-item d-flex" style="` + cursorPointer + `" onclick="`+ summaryClick +`">
                <div class="d-flex align-items-center" style="padding: 5px;">
                    <div style="left: 5px; position: relative;">
                        <span class="player-name mt-2 mb-0" style="color: #000; font-weight: bold; font-size: 16px;"> &nbsp; ${currentEv.eventName}</span>
                        <br>
                        <span id="event-time-${currentEv._id}" class="player-name mb-2 mt-0" style="color: #000;"> &nbsp; ${eventPrettyDate} at ${eventPrettyTime}</span>
                    </div>
                    <a onclick="joinEvent('${currentEv.eventCreator}')" class="btn btn-success font-weight-bold" style="` + joinButtonDisplay + ` border: 0; border-radius: 25px; right: 10px; position: absolute;"> Join now </a>
                </div>
            </div>`);

        counter += 1;
    }
    
}

function updateEventDates(eventScheduled, eventOwnerId) {
    var timeLeft = eventScheduled - new Date();

    setTimeout(function () {
        $('#event-summary-item-' + eventOwnerId).attr('onclick', `joinEvent('${eventOwnerId}')`).css('cursor', 'default');
        $('#event-summary-item-' + eventOwnerId).find('a').css('display', 'flex');
        
        //Removes the event from the list after 1 hour
        setTimeout(function () {
            $('#event-summary-item-' + eventOwnerId).remove();
        }, 3600000);
    }, timeLeft);
}


function openEventDetails(eventId) {
    //Shows event details & hides all events header
    $('#event-details-header').removeClass('d-none');
    $('#all-events-header').addClass('d-none');

    //Shows the event details container and hides the upcoming events container
    $('#event-details-container').removeClass('d-none');
    $('#upcoming-events-container').addClass('d-none');


    //Tells the server to send details about the event
    sendMessage({
        type: 'get-event-details',
        data: eventId
    });

    mixpanel.track('Load Event Details', {
        'ownId': ownId,
        'eventId': eventId
      });
}

function loadEventDetails(data) {
    //Clearing previous data
    $('#nav-home').html('');
    $('#nav-profile').html('');
    $('#nav-contact').html('');

    $('#nav-home-tab').removeClass('d-none');
    $('#nav-profile-tab').removeClass('d-none');
    $('#nav-contact-tab').removeClass('d-none');

    $('#event-response-selection').removeData('id');
    $('#event-response-no').removeClass('selected');
    $('#event-response-yes').removeClass('selected');

    var eventInfo = data.event;
    //Updates the header and the subheader
    $('#event-details-header').find('span').text(eventInfo.eventName);

    //A loop to add users along with their responses to their invite
    var counter = 0
    while (counter < (data.playerName).length) {
        var currentAvatar = ((data.playerAvatar)[counter]);
        var currentId = ((data.playerId)[counter]);
        var currentComing = ((data.playerComing)[counter]);

        //Deciding the name
        var currentName
        if (currentId == ownId) {
            currentName = 'You';
        } else {
            currentName = ((data.playerName)[counter]);
        }

        //If the current user is the event creator
        if (eventInfo.eventCreator == currentId) {
            //Sets the 'by ' Username (next to the header)
            $('#event-details-header').find('b').text(' BY ' + currentName.toUpperCase());
        }

        //Decides which list the user will go to
        var userList;
        if (currentComing == true) {
            //When they are coming
            userList = $('#nav-home');
        } else if (currentComing == false) {
            //When they aren't coming
            userList = $('#nav-contact');
        } else if (currentComing == null) {
            //When they haven't decided
            userList = $('#nav-profile');
        }

        //Checking if the user has an avatar
        var avatarBgImg = "";
        if (currentAvatar) {
            avatarBgImg = "background-image: url('" + currentAvatar + "');";
        }
        
        userList.append(`
                  <div id="event-invite-item-${currentId}" class="justify-content-between mt-2 mutual-friend-item d-flex">
                      <div class="d-flex align-items-center">
                          <img class="friend-avatar" style="left: 0; width: 38px; height: 38px; ${avatarBgImg}">
                          <span class="player-name" style="color: #000;"> &nbsp; ${currentName}</span>
                      </div>
                  </div>`);

        counter += 1;
    }

    var clicked = 0;
    //After filling the info check if any of the lists are empty
    if ($('#nav-home').html() == '') {
        $('#nav-home-tab').addClass('d-none');
    } else if (clicked == 0) {
        $('#nav-home-tab').click();
        clicked = 1;
    }

    if ($('#nav-profile').html() == '') {
        $('#nav-profile-tab').addClass('d-none');
    } else if (clicked == 0) {
        $('#nav-profile-tab').click();
        clicked = 1;
    }

    if ($('#nav-contact').html() == '') {
        $('#nav-contact-tab').addClass('d-none');
    } else if (clicked == 0) {
        $('#nav-contact-tab').click();
        clicked = 1;
    }

    //Showing the user their response
    var eventSelection = $('#event-response-selection');
    if (data.inviteResponse.coming == true) {
        $('#event-response-yes').addClass('selected');
    } else if (data.inviteResponse.coming == false) {
        $('#event-response-no').addClass('selected');
    }

    $('#event-response-selection').attr('data-id', data.inviteResponse.eventId);
}

function joinEvent(eventOwnerId) {
    sendMessage({
        type: 'ring-friend',
        data: eventOwnerId
    });
}

function eventResponseUpdate(eventResponse) {
    var eventId = $('#event-response-selection').data('id');

    mixpanel.track('Event Response Update', {
        'ownId': ownId,
        'eventId': eventId,
        'response': eventResponse
      });

    if (eventResponse == true) {
        $('#event-response-no').removeClass('selected');
        $('#event-response-yes').addClass('selected');
    } else {
        $('#event-response-yes').removeClass('selected');
        $('#event-response-no').addClass('selected');
    }

    sendMessage({
        type: 'event-response-update',
        data: { eventId, eventResponse }
    });
}

