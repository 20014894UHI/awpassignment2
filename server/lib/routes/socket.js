const cv = require("opencv4nodejs");
const fs = require ("fs"); 
const path = require ("path"); 

console.log("IN socket.js");

// camera properties 
const camWidth = 640; 
const camHeight = 480; 
const camFps = 10; 
const camInterval = 1000/camFps; 

const rectColor = [0, 255, 0]; 
const rectThickness = 2; 

const camera = new cv.VideoCapture(0); 
camera.set(cv.CAP_PROP_FRAME_WIDTH, camWidth);
camera.set(cv.CAP_PROP_FRAME_HEIGHT, camHeight); 

//const faceClassifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_DEFAULT); 
//const eyeClassifier = new cv.CascadeClassifier(cv.HAAR_EYE); 

//const drawRect = (image, rect, color, opts = {thickness: 2}) => image.drawRectangle(rect, color, opts.thickness, cv.LINE_8); 

//const drawBlueRect = (image, rect, opts = {thickness: 2}) => drawRect(image, rect, new cv.Vec(255, 0,0), opts); 

//const drawGreenRect = (image, rect, opts = {thickness: 2}) => drawRect(image, rect, new cv.Vec(0,255, 0), opts); 

module.exports = function (socket) { 
     setInterval(function() {
        let frame=camera.read();
        console.log("here");
        socket.emit("frame", { 
            buffer: cv.imencode(".png", frame).toString("base64")
        });
    }, camInterval);
}


        //const image = cv.imencode(".png", frame).toString('base64');
        //io.emit('image', image);
        //socket.emit('frame', image);
        //}, 1000)
        //console.log("reading camera");
        // opencv additinos here   
        //socket.emit("frame", jpeg_frame.toString('base64'));

   //const image1 = cv.imencode('.jpg', frame).toString('base64');
        //io.emit('image', image);
        //}, 1000)
        
        // Encodes an image into a memory buffer
        // convert Mat to base64 encoded jpg image
        // JADWH const outBase64 =  cv.imencode('.jpg', croppedImage).toString('base64'); 
        // return   cv.imencode('.jpg', img).toString('base64');
     