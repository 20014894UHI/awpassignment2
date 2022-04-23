const express = require("express"), 
http = require("http"), 
path = require("path");
const app = express();

app.set("port", 8080);
app.use(express.static(path.join(__dirname + "/../client"))); 

app.get("*", function(req, res)  {
    res.sendFile("index.html", { root: path.join(__dirname + "/../client")})
});

const server = http.createServer(app); 
server.listen(app.get("port"), function() {
    console.log("HTTP server listenning on port " + app.get("port"));
});
const io = require ("socket.io")(server);
//io.on('connection', (socket) => {console.log('a user connected');}); 
io.on("connection", require("./lib/routes/socket"));
//console.log('a user connected'); 

module.exports.app = app; 