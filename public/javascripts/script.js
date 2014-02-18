/**
 * Title of the webpage.
 * @type {string}
 */
var title = "Supa's EXtreme chat";
var version = 1.0;

var messageContainer;
var submitButton;
var nick = "";
var autoScroll = true;

var PACKETS = {
    SEND_MESSAGE: 0,
    SET_NICK: 1,
    NICK_STATUS: 2,
    USER_COUNT: 3
}

// Initialisation
$(function () {
    $("#title").html(title);
    setupComponents();
    // TODO This doesn't actually work.
    jQuery(document).ready(function ($) {
        $("abbr.timeago").timeago();
    });
    $("#alertNick").hide();
    $("#errorInsertNick").hide();
    $('#modalNick').modal('show');
    $("#nickSubmit").click(function () {
        $("#errorInsertNick").hide();
        setNick();
    });

    updateEntriesScroll();
    var entries = $("#chatEntries");
    // TODO improve this auto scrolling listener, this is terrible but will suffice for now.
    entries.bind('slimscroll', function (e, pos) {
        if (pos == "top") {
            autoScroll = false;
        } else {
            autoScroll = true;
        }
    });
});

// Socket.io
var socket = io.connect();
socket.on('connect', function () {
    console.log('connected');
});

socket.on(PACKETS.USER_COUNT, function (data) {
    $("#userCount").html(data.count);
});

socket.on(PACKETS.SEND_MESSAGE, function (data) {
    addMessage(data['message'], data['nick'], data['date'], false);
    console.log(data);
});

/**
 * Sends a message of the message's textbox value.
 */
function sendMessage() {
    if (messageContainer.val() != "") {
        if (nick == "") {
            $('#modalNick').modal('show');
        } else {
            socket.emit(PACKETS.SEND_MESSAGE, messageContainer.val());
            addMessage(messageContainer.val(), "Me", new Date().toISOString(), true);
            messageContainer.val('');
            submitButton.button('loading');
        }
    }
}

/**
 * Simplified function for addMessage(message, nick, date, self) that only takes message as an argument.
 * @param message message to broadcast
 */
function broadcastMessage(message) {
    addMessage(message, null, new Date().toISOString(), false);
}

/**
 * Adds a message to the chat entries.
 * @param message message to add
 * @param nick nick that sent the message, nullable
 * @param date the date of this message
 * @param self whether this message was from this client.
 */
function addMessage(message, nick, date, self) {

    var classDiv = "message";
    if (self) {
        classDiv += " self";
    }

    if (nick == null) {
        nick = "<b>Broadcast</b>"
    }
    var entries = $("#chatEntries");
    entries.append('<div class="' + classDiv + '"><p class="info"><span class="nick">' + nick + '</span>, ' +
        '<abbr class="timeago" title="' + date + '">' + date + '</abbr></p><p>' + message + '</p></div>');
    if (autoScroll) {
        updateEntriesScroll();
    } else {
        entries.slimScroll();
    }
}

/**
 * This method initialises listeners for the client's components, such as message textbox.
 */
function setupComponents() {

    messageContainer = $('#messageInput');
    submitButton = $('#submit');
    submitButton.button('loading');

    messageContainer.on('input', function () {
        if (messageContainer.val() == "") {
            submitButton.button('loading');
        } else {
            submitButton.button('reset');
        }
    });

    messageContainer.keydown(function (e) {
        // Check if the client pressed down the enter key (key code 13).
        if (e.keyCode == 13) {
            sendMessage();
        }
    });

    submitButton.click(function () {
        sendMessage();
        messageContainer.focus();
    });

    $(document).keydown(function (e) {

        // Check if it's a character
        if (48 > e.keyCode || 90 < e.keyCode) {
            return;
        }

        var input = null;
        if ($("#modalInfo").hasClass('in')) {
            return;
        }

        if ($("#modalNick").hasClass('in')) {
            input = $("#nickInput");
        } else {
            input = messageContainer;
        }

        if (input.is(":focus")) {
            return;
        }

        input.focus();
    });
}

function setNick() {
    var input = $("#nickInput");
    if (input.val() != "") {
        socket.emit(PACKETS.SET_NICK, input.val());
        socket.on(PACKETS.NICK_STATUS, function (data) {
            if (data == "OK") {
                $('#modalNick').modal('hide');
                $("#errorInsertNick").hide();
                $("#alertNick").hide();
                nick = input.val();
            }
            else {
                $("#alertNick").slideDown();
            }
        });
    } else {
        $("#errorInsertNick").slideDown();
    }
}

/**
 * Updates the chat entries scroll bar.
 */
function updateEntriesScroll() {

    var entries = $("#chatEntries");
    entries.slimScroll({
        height: '600',
        start: 'bottom',
        color: '#2051AB',
        opacity: 1,
        railVisible: true,
        railOpacity: 0.25,
        allowPageScroll: false,
        disableFadeOut: true,
        alwaysVisible: true,
        // TODO figure out a better way to scroll to the bottom automatically
        scrollBy: 200
    });
}
