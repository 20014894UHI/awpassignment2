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
  //    socket.send('Glasses are', (showGlasses==true?"on":"off"));
 //     socket.send('MUstache is', (mustache==true?"on":"off"));
 //      io.on('showHideGlasses', function (msg) {
  //     console.log('Glasses: ', msg);
  //    });
});

// io.on("connection", (socket) => {
//     // send a message to the client
//     socket.emit("hello from server", 1, "2", { 3: Buffer.from([4]) });
//     // receive a message from the client
//     socket.on("hello from client", (...args) => {
//       // ...
//     });
//   });

module.exports.app = app;
// const express = require("express"), http = require("http"), path = require("path");

// const app = express();

// app.set("port", 8080)
// app.use(express.static(path.join(__dirname + "/../client")));

// app.get("*", function(req, res) {
//     res.sendFile("index.html", { root: path.join(__dirname + "/../client")});
// })

// const server = http.createServer(app);
// server.listen(app.get("port"), function() {
//     console.log("HTTP server listening on port " + app.get("port"));
// })

// const io = require("socket.io")(server);
// io.on("connection", require("./lib/routes/socket"));

// module.exports.app = app;

// const express = require("express"), 
// http = require("http"), 
// path = require("path");
// //morgan = require('morgan'); later 

// const app = express();

// app.set("port", 8080);
// app.use(express.static(path.join(__dirname + "/../client"))); 

// app.get("*", function(req, res)  {
//     res.sendFile("index.html", { root: path.join(__dirname + "/../client")})
// });

// const server = http.createServer(app); 
// server.listen(app.get("port"), function() {
//     console.log("HTTP server listenning on port " + app.get("port"));
// });
// const io = require ("socket.io")(server);
// //io.on('connection', (socket) => {console.log('a user connected');}); 
// io.on("connection", require("./lib/routes/socket"));
// console.log('a user connected'); 
// module.exports.app = app; 