const socket = io.connect("http://localhost:8080");

function btnMustacheClicked(){
  socket.emit('showHideMustache');
}

function btnRectanglesClicked(){
  socket.emit('showHideRectangles');
 }

function btnGlassesClicked(){
  socket.emit('showHideGlasses');
}

const canvas = document.getElementById("canvas-video");
const context = canvas.getContext("2d");
const img = new Image();
  
 socket.on( 'connect', function() {
   console.log( 'A user connected' );
 });


   socket.on('disconnect', function() {
     console.log('A user disconnected');
   });

socket.on("frame", function(data) {
  img.onload = function() {
    context.drawImage(this, 0, 0, canvas.width, canvas.height)
  };
  img.src = "data:image/png;base64," + data.buffer;
})
