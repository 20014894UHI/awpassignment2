const socket = io.connect("http://localhost:8080"); 

const canvas = document.getElementById("canvas-video"); 
const context = canvas.getContext("2d"); 
const img = new Image(); 

socket.on("frame", function(data){
    //console.log("data", data);
    img.onLoad = function() {
        context.drawImage(this, 0, 0, canvas.width, canvas.height); 
    }; 
    img.src= "data:image/png;base64," + data.buffer;
    //img.src= "data:image/jpg;base64," + data.buffer;
});