const socket = io.connect("http://localhost:8080");
//
// var messages = document.getElementById('messages');
// var form = document.getElementById('form');
// var input = document.getElementById('input');
// form.addEventListener('submit', function(e) {
//     e.preventDefault();
//     if (input.value) {
//       socket.emit('chat message', input.value);
//       input.value = '';
//     }
//   });
//

//let showGlasses=true; 
//let showMustache=true; 

function btnMustacheClicked(){
  socket.emit('showHideMustache');
}

function btnRectanglesClicked(){
  socket.emit('showHideRectangles');
 }

function btnGlassesClicked(){
  socket.emit('showHideGlasses');
  //socket.emit('showHideGlasses', { showGlasses: showGlasses });
  //showGlasses=!showGlasses;
  //socket.emit('showHideGlasses');
  //socket.emit('showGlasses is', showGlasses);
  //socket.emit('Glasses button clicked');
}

//let btnShowGlasses= document.getElementById('btnShowGlasses');
//let btnShowMustache= document.getElementById('btnShowMustache');

const canvas = document.getElementById("canvas-video");
const context = canvas.getContext("2d");
const img = new Image();
//
// socket.on('chat message', function(msg) {
//     var item = document.createElement('li');
//     item.textContent = msg;
//     messages.appendChild(item);
//     window.scrollTo(0, document.body.scrollHeight);
//   });
//
  
 socket.on( 'connect', function() {
   console.log( 'A user connected' );
   //console.log( "Glasses", showGlasses );
   //console.log( "MUstache", showMustache );
 });

//  socket.on( 'connect', function() {
//     console.log( "showGlasses", showGlasses );
//     console.log( "showMUstache", showMustache );
// });

// socket.on('connect', function () {
//   console.log('A user connected');

//   socket.on('message', function(message) {
//     console.log(message);
//   });

   socket.on('disconnect', function() {
     console.log('A user disconnected');
   });
// });

// socket.on('connection', (socket) => {
// 	console.log('A user connected.');
//     socket.on('disconnect', () => {
//         console.log('A user has disconnected.');
//     })
// });

socket.on("frame", function(data) {
  img.onload = function() {
    context.drawImage(this, 0, 0, canvas.width, canvas.height)
  };
  img.src = "data:image/png;base64," + data.buffer;
})

///@@@@ added 
// socket.on( 'disconnect', function() {
//   console.log( 'A user disconnected' );
//   });
  // send a message to the server
// socket.emit("showglasses", 5, "6", { 7: Uint8Array.from([8]) });
// receive a message from the server
// socket.on("showglasses", (...args) => {
  // ...
// });
// socket.on("lasses", (...args) => {
//   // ...
// });

//@@@ added 
  // const socket = io.connect("http://localhost:8080"); //     // 1. app.js Connect socket.io to localhost 

//const { builtinModules } = require("module");

// const canvas = document.getElementById("canvas-video");
// const context = canvas.getContext("2d");
// const img = new Image();

// socket.on("frame", function(data) {
//     img.onload = function() {
//         context.drawImage(this, 0, 0, canvas.width, canvas.height)
//     };
//     img.src = "data:image/png;base64," + data.buffer;
// })

// const socket = io.connect('http://localhost:8080'); 
// const canvas = document.getElementById("canvas-video"); 
// const context = canvas.getContext("2d"); 
// const img = new Image(); 

// socket.on("connect_error", (err) => {
//          console.log(`connect_error due to ${err.message}`);
//    });

// // // 2. listening to the frame event 
// socket.on("frame", function(data) {
//     console.log("mydata ", data.data);  
//     console.log("mydata2", data.dataEyes);    
//      img.onload = function() {
//          context.drawImage(this, 0, 0, canvas.width, canvas.height);
//      }; 
// //     //img.src= `data:image/png;base64,${data.buffer}`;
//      img.src= `data:image/png;base64,` + data.buffer;
//  });


// //Listening on the event.
// socket.on("acknowledged" , ()=>{
//     alert("Action acknowledged by the server");
// });


// //socket.on('image', (data)=>{
//     //console.log('data', data);
//     // Won't work currently without the line below 
//     // Reference: http://stackoverflow.com/questions/24107378/socket-io-began-to-support-binary-stream-from-1-0-is-there-a-complete-example-e/24124966#24124966
//     //var uint8Arr = new Uint8Array(data.buffer);
//     //var str = String.fromCharCode.apply(null, uint8Arr);
//     //var base64String = btoa(str); 
//     //imageEle.src = `data:image/png;base64,` + data.buffer; 
// //});

