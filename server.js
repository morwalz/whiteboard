var express = require('express'),
    http = require('http'),
    sanitizer = require('validator').sanitize,
    sio= require('socket.io'),
    fs=require('fs'),
    app = express();

// Load site handler
require( __dirname +'/controllers/handler.js')(app);
//Load public static resources like css and images
app.use(express.static( __dirname +'/public'));

//Define template engine. We will use ejs for templates.
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

// Start the server
var server=app.listen(3000, function () {
    console.log("Express server listening on port %d",3000);
});
app.io=io=sio.listen(server);
var chat = io.of('/chat');
var canvas = io.of('/canvas');
function sanitize(string) {
    return sanitizer(string).entityDecode()
}

io.on('connection', function(socket) {
    console.log("socket connected ",socket);
    socket.on('setName', function (name) {
        console.log("setname recieved",message);
        name = sanitize(name);
        socket.set('name', name);
        socket.broadcast.emit('receive', {
            sender:'Server',
            message:name + ' has joined.'
        })
    });

    socket.on('send', function (message) {
        console.log("send recieved",message);
        socket.get('name', function(error, name) {
            if (name)
                socket.broadcast.emit('receive', {
                    sender:name,
                    message:sanitize(message)
                })
        })
    });

    socket.on('draw', function (command) {
        io.sockets.emit('draw', command)
    });

    socket.on('updateCursor', function(position) {
        console.log("uopdate cursor recieved",position);
        /*socket.get('name', function(error, name) {
            if (name)
                socket.broadcast.emit('updateCursor', {
                    name:name,
                    position:position
                });
        });*/
    });

    socket.on('disconnect', function() {
        /*socket.get('name', function(error, name) {
            if (name) {
                socket.broadcast.emit('receive', {
                    sender:'Server',
                    message:name + ' has left.'
                });
                socket.broadcast.emit('removeCursor', name);
            }
        })*/
        socket.broadcast.emit('receive', {
            sender:'Server',
            message:"server" + ' has left.'
        });
        socket.broadcast.emit('removeCursor', "server");
    });
});
