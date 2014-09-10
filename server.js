var
    port = +process.argv[2] || 8080,

    sanitizer = require('validator').sanitize,
    express = require('express'),

    server = express.createServer(),
    io = require('socket.io').listen(server),
    fs = require('fs'),
    chat = io.of('/chat'),
    canvas = io.of('/canvas')
;

function sanitize(string) {
    return sanitizer(string).entityDecode()
}

server.listen(port);

server.get(/(^\/.*$)/, function(request, response) {
    var fileName = request.params[0];
    if (fileName == '/')
        fileName = '/index.html';
    console.log("request index file",fileName);

    fs.readFile(__dirname + '/client/'+fileName,
        function (err, data) {
            response.writeHead(200);
            response.end(data);
        });
});

io.sockets.on('connection', function(socket) {
    socket.on('setName', function (name) {
        name = sanitize(name);
        socket.set('name', name);
        socket.broadcast.emit('receive', {
            sender:'Server',
            message:name + ' has joined.'
        })
    });

    socket.on('send', function (message) {
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
        socket.get('name', function(error, name) {
            if (name)
                socket.broadcast.emit('updateCursor', {
                    name:name,
                    position:position
                });
        });
    });

    socket.on('disconnect', function() {
        socket.get('name', function(error, name) {
            if (name) {
                socket.broadcast.emit('receive', {
                    sender:'Server',
                    message:name + ' has left.'
                });
                socket.broadcast.emit('removeCursor', name);
            }
        })
    });
});
