// const socket = io.connect("http://localhost:8080"); //     // 1. app.js Connect socket.io to localhost 

// const canvas = document.getElementById("canvas-video");
// const context = canvas.getContext("2d");
// const img = new Image();

// socket.on("frame", function(data) {
//     img.onload = function() {
//         context.drawImage(this, 0, 0, canvas.width, canvas.height)
//     };
//     img.src = "data:image/png;base64," + data.buffer;
// })

const socket = io.connect('http://localhost:8080'); 
// //const imageEle = document.getElementById('image');
const canvas = document.getElementById("canvas-video"); 
const context = canvas.getContext("2d"); 
const img = new Image(); 

// //const canvas2 = document.getElementById("canvas-text"); 
// //const context2 = canvas2.getContext("2d"); 
// //context2.font = 'italic 32px sans-serif';

socket.on("connect_error", (err) => {
         console.log(`connect_error due to ${err.message}`);
   });

// // 2. listening to the image?frame? event 
socket.on("frame", function(data) {
    console.log("mydata ", data.data);  
    //console.log("mydata ", data.dataEyes);    
     img.onload = function() {
         context.drawImage(this, 0, 0, canvas.width, canvas.height);
     }; 
//     //img.src= `data:image/png;base64,${data.buffer}`;
     img.src= `data:image/png;base64,` + data.buffer;
 });

// //socket.on('image', (data)=>{
//     //console.log('data', data);
//     // Won't work currently without the line below 
//     // Reference: http://stackoverflow.com/questions/24107378/socket-io-began-to-support-binary-stream-from-1-0-is-there-a-complete-example-e/24124966#24124966
//     //var uint8Arr = new Uint8Array(data.buffer);
//     //var str = String.fromCharCode.apply(null, uint8Arr);
//     //var base64String = btoa(str); 
//     //imageEle.src = `data:image/png;base64,` + data.buffer; 
// //});

