    // 1. app.js Connect socket.io to localhost 
const socket = io.connect('http://localhost:8080'); 

// Get image and display it via img tag
const imageEle = document.getElementById('image');

const canvas = document.getElementById("canvas-video"); 
const context = canvas.getContext("2d"); 
const img = new Image(); 

const canvas2 = document.getElementById("canvas-text"); 
const context2 = canvas2.getContext("2d"); 
context2.font = 'italic 32px sans-serif';

socket.on("connect_error", (err) => {
    console.log(`connect_error due to ${err.message}`);
  });

// 2. listening to the image?frame? event 
socket.on("frame", function(data) {
    img.onLoad = function() {
        context.drawImage(this, 0, 0, canvas.width, canvas.height);
        context2.fillText(data.buffer, 10, 50);  
    }; 
    //img.src= `data:image/png;base64,${data.buffer}`;
    img.src= `data:image/png;base64,` + data.buffer;
});

socket.on('image', (data)=>{
    //console.log('data', data);
    // Won't work currently without the line below 
    imageEle.src = `data:image/png;base64,` + data.buffer; 
});