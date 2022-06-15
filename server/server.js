const express = require("express"), http = require("http"), path = require("path");

const app = express();

app.set("port", 8080)
app.use(express.static(path.join(__dirname + "/../client")));

app.get("*", function(req, res) {
    res.sendFile("index.html", { root: path.join(__dirname + "/../client")});
})

const server = http.createServer(app);
server.listen(app.get("port"), function() {
    console.log("HTTP server listening on port " + app.get("port"));
})

const io = require("socket.io")(server);
io.on("connection", require("./lib/routes/socket"));

io.sockets.on('connection', function (socket) {
socket.send('Hello from the server');

});


module.exports.app = app;
