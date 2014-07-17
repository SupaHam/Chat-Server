/**
 * Port to start the application on
 * @type {number}
 */
var port = 3000;

/**
 * Title of the webpage.
 * @type {string}
 */
var title = "Supa's EXtreme chat";

/**
 * Usernames that are taken.
 * @type {string[]}
 */
var nicks = ['admin'];

/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var ent = require('ent');

var app = express();
var chat = {};
chat.PACKETS = {
    SEND_MESSAGE: 0,
    SET_NICK: 1,
    NICK_STATUS: 2,
    USER_COUNT: 3
}

// all environments
app.set('port', port);
app.set('title', title);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('view options', { layout: false});
app.use(express.favicon());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
//if (app.get('env') == 'development') {
//    app.use(express.errorHandler());
//}

app.get('/', function (req, res) {
    res.render('index.jade');
});


var server = http.createServer(app);
var io = require('socket.io').listen(server, {
    // Pls no debugging, too verbose.
    log: false
});

server.listen(port);
console.log('Server listening on port ' + port);
// User count
var userCount = 0;

// Listens for clients connecting.
io.sockets.on('connection', function (socket) {

    addSocket(socket);

    // Listens for clients disconnecting.
    socket.on('disconnect', function () {
        removeSocket(socket);
    });

    // Listens for clients sending messages.
    socket.on(chat.PACKETS.SEND_MESSAGE, function (message) {
        
        if (hasNick(socket)) {
            broadcastMessage(socket, message, false);
            console.log("user " + getNick(socket) + " said \"" + message + "\"");
        }
    });

    // Listens for clients setting their nick name.
    socket.on(chat.PACKETS.SET_NICK, function (nick) {
        setNick(socket, nick);
    });
});

/**
 * Broadcasts a message from a socket to all other sockets.
 *
 * @param socket socket to use, use null to broadcast a normal message
 * @param message message to broadcast
 * @param sendToConsole whether to send this message to the console as well
 */
function broadcastMessage(socket, message, sendToConsole) {

    // Encode message to prevent XSS
    var encoded = ent.encode(message);
    
    var transmit = {date: new Date().toISOString(), nick: socket == null ? null : getNick(socket), message: encoded};
    if (socket == null) {
        io.sockets.emit(chat.PACKETS.SEND_MESSAGE, transmit);
    } else {
        socket.broadcast.emit(chat.PACKETS.SEND_MESSAGE, transmit);
    }
    if (sendToConsole) {
        console.log(message);
    }
}

/**
 * Updates the user count for all connected users.
 */
function updateUserCount() {
    io.sockets.emit(chat.PACKETS.USER_COUNT, {count: userCount});
}

/**
 * Checks whether a socket has set their nick.
 *
 * @param socket socket to check
 * @returns {boolean} true if the socket has a nick, otherwise false
 */
function hasNick(socket) {
    return getNick(socket) != null;
}

/**
 * Gets a socket's nick.
 *
 * @param socket socket to get
 * @returns {*} the socket's nick
 */
function getNick(socket) {

    var nick = null;
    socket.get('nick', function (err, name) {
        nick = name;
    });

    return nick;
}

/**
 * Sets a socket's nick.
 *
 * @param socket socket to use
 * @param nick nickname to set
 * @returns {boolean} true if the nick was successfully set, otherwise false
 */
function setNick(socket, nick) {

    if (nicks.length > 0) {
        var uppercase = nick.toUpperCase();
        var taken = false;
        nicks.forEach(function (entry) {
            if (uppercase === entry.toUpperCase()) {
                taken = true;
            }
        });

        if (taken) {
            socket.emit(chat.PACKETS.NICK_STATUS, 'ERROR');
            return false;
        }
    }

    var oldNick = getNick(socket);
    socket.set('nick', nick);
    nicks.push(nick);
    socket.emit(chat.PACKETS.NICK_STATUS, 'OK');
    if (oldNick != null) {
        var index = nicks.indexOf(oldNick);
        nicks.splice(index, 1);
        broadcastMessage(null, oldNick + " is now known as " + nick + ".", true);
    } else {
        broadcastMessage(null, "User " + nick + " connected.", true);
    }
    return true;
}

/**
 * Adds a socket to the server.
 *
 * @param socket socket to add
 */
function addSocket(socket) {

    userCount += 1;
    updateUserCount();
    var address = socket.handshake.address;
    console.log(address.address + ":" + address.port + " connected.");
}

/**
 * Removes a socket from the server.
 *
 * @param socket socket to remove
 * @returns {boolean} true if the socket was successfully removed, otherwise false
 */
function removeSocket(socket) {

    userCount -= 1;
    updateUserCount();

    if (hasNick(socket)) {
        var nick = null;
        socket.get('nick', function (err, name) {
            nick = name;
        });
        var index = nicks.indexOf(nick);
        nicks.splice(index, 1);
        broadcastMessage(null, "User " + nick + " disconnected.", true);
        return true;
    } else {
        return false;
    }
}
