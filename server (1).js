/* server.js */
/* author: Azinum */
/* date: 2016/10/18 */

var express = require("express");
var Server = require("http").Server;
var session = require("express-session");
var app = express();
var server = Server(app);
var io = require("socket.io")(server);
var fs = require("fs");

app.use(express.static(__dirname + "/static"));

app.get("/", function (req, res, next) {
    res.sendFile(__dirname + req);
});

/* public data */
var world = {
    entities: {},
    users_peeked: 0
};

var config = {
    speed: 7,
    fps: 60,
    port: 5000,
    screenWidth: 1350,  // Screen width for boundary check
    screenHeight: 600  // Screen height for boundary check
};

var Server = function () {
    io.on("connect", function (socket) {
        var position = [
            Math.round(Math.random() * 500),
            Math.round(Math.random() * 500)
        ];
        var client = {
            id: world.users_peeked,
            pos: position,
            target_pos: position,
            w: 50,
            h: 50,
            speed: [0, 0],
            color: "black",
            name: "Guest(" + (Object.keys(world.entities).length + 1) + ")"
        };

        var init = function () {
            console.log("User connected");
            world.entities[world.users_peeked++] = client;
            io.sockets.emit('update', world);
        };

        socket.on("disconnect", function () {
            console.log("User disconnected");
            delete world.entities[client.id];
            io.sockets.emit('update', world);
        });

        /* user sent command */
        socket.on("command", function (string) {
            /* command : "arg" */
            data = string.split(" ");
            switch (data[0]) {
                case "update": {
                    socket.emit("update", world);
                }
                    break;

                case "update_entities": {
                    socket.emit("update_entities", world.entities);
                }
                    break;

                case "name": {
                    if (string.length < 27) {
                        world.entities[client.id].name = string.substring((string.length - (string.length - data[0].length)));
                    } else {
                        world.entities[client.id].name = "Name too long";
                    }
                    io.sockets.emit('update', world);   /* update name to everyone */
                }
                    break;

                case "color": {
                    world.entities[client.id].color = string.substring((string.length - (string.length - data[0].length)) + 1);
                    io.sockets.emit('update', world);   /* update name to everyone */
                }
                    break;

                default:
                    break;
            }
        });

        socket.on("input", function (data) {
            var entity = world.entities[client.id];

            if (data[65] || data[37]) { /* A or Left Arrow */
                if (entity.target_pos[0] > 0) { // Prevent moving past the left edge
                    entity.target_pos[0] -= config.speed;
                }
            }
            if (data[68] || data[39]) { /* D or Right Arrow */
                if (entity.target_pos[0] + entity.w < config.screenWidth) { // Prevent moving past the right edge
                    entity.target_pos[0] += config.speed;
                }
            }
            if (data[87] || data[38]) { /* W or Up Arrow */
                if (entity.target_pos[1] > 0) { // Prevent moving past the top edge
                    entity.target_pos[1] -= config.speed;
                }
            }
            if (data[83] || data[40]) { /* S or Down Arrow */
                if (entity.target_pos[1] + entity.h < config.screenHeight) { // Prevent moving past the bottom edge
                    entity.target_pos[1] += config.speed;
                }
            }

            io.sockets.emit("move", { id: client.id, target_pos: entity.target_pos });
        });

        init();
    });

    console.log("Server started on port", config.port);
    server.listen(config.port);
};

server = new Server();
