//Function to close the notification
function closeNotification() {
    document.getElementById("notification-msg").style.display = "none";
}
  
function showNotification(type, message) {
    //Updates the error msg and then shows the error msg text
    document.getElementById("notification-msg-text").innerHTML = message;

    if (type == "success") {
        document.getElementById("notification-msg-text").style.color = "#1db100";
    } else if (type == "error"){
        document.getElementById("notification-msg-text").style.color = "#b10000";
    }

    document.getElementById("notification-msg").style.display = "flex";

    //Hides the error msg after 5 seconds
    setTimeout(function() {
        closeNotification();
    }, 5000);
}

    //Links the close button to the close function
    $('#close-msg-notification').click(function() {
    closeNotification();
});