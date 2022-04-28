const cv = require("opencv4nodejs");
const fs = require("fs");
const path = require("path");
const socketIOProvider = require('socket.io');

// camera properties
const camWidth = 640;
const camHeight = 480;
const camFps = 10;
const camInterval = 1000/camFps;

const rectColor = [0, 255, 0];
const rectThickness = 2;

const webcamPort = 0; //const videoSource = 0;  set to 0 for stream from webcam
const camera = new cv.VideoCapture(0); //  VideoCapture(webcamPort);//const videoCap = new cv.VideoCapture(videoSource);
camera.set(cv.CAP_PROP_FRAME_WIDTH, camWidth);
camera.set(cv.CAP_PROP_FRAME_HEIGHT, camHeight);

//const faceClassifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_DEFAULT);
// used with mona lisa example 
const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
const eyeClassifier = new cv.CascadeClassifier(cv.HAAR_EYE);
const drawRect =     (image, rect, color, opts = { thickness: 2 }) => image.drawRectangle(rect, color, opts.thickness, cv.LINE_8);
const drawBlueRect = (image, rect, opts = { thickness: 2}) => drawRect(image, rect, new cv.Vec(255, 0, 0), opts);
const drawGreenRect = (image, rect, opts = { thickness: 2}) => drawRect(image, rect, new cv.Vec(0, 255, 0), opts);
module.exports = function(socket) {
    //console.log("faceClassifier", JSON.stringify(faceClassifier))
    ///const faceResult = faceClassifier.detectMultiScale(mat.bgrToGray());
    setInterval(async function() {
        let frame = camera.read();
        // try {
        //     const img = await cv.imreadAsync(frame);
             const grayImg = await frame.bgrToGrayAsync();
             const faceResult = classifier.detectMultiScale(grayImg);
            // drawRect(frame, new cv.Rect(10, 10, 50, 50),  new cv.Vec(255, 0, 0), {thickness:2}) 
             console.log( faceResult ); 

           
             if (faceResult.objects.length>0) {
                const faceRect = faceResult.objects[0];
                drawBlueRect(frame, faceResult.objects[0]); 
                const faceRegion = frame.getRegion(faceRect);
                //const eyeResult = eyeClassifier.detectMultiScale(faceResult.objects[0]);
                            
    // detect eyes
    //const faceRegion = frame.getRegion(faceRect);
    //const eyeResult = eyeClassifier.detectMultiScale(faceRegion);
    //console.log('eyeRects:', eyeResult.objects);
    // console.log('confidences:', eyeResult.numDetections);
            //    console.log( eyeResult); 
                //if (eyeResult.objects.length>0) {
                //    //const eyeRect = faceResult.objects[0];
                //    drawGreenRect(frame, eyeResult.objects[0]); 
                //}
             }

 

    // // get best result
    // const eyeRects = sortByNumDetections(eyeResult)
    //   .slice(0, 2)
    //   .map(idx => eyeResult.objects[idx]);

    // // draw face detection
    // drawBlueRect(image, faceRect);

    // // draw eyes detection in face region
    // eyeRects.forEach(eyeRect => drawGreenRect(faceRegion, eyeRect));

            //
             // get best result
 
    //console.log('faceRects:', faceResult.objects);
    //console.log('confidences:', faceResult.numDetections);

    // detect eyes
    //const faceRegion = image.getRegion(faceRect);
            // detect eyes
            //const faceRegion = frame.getRegion(faceRect);
          // const eyeResult = eyeClassifier.detectMultiScale(faceResult);
         //   console.log('eyeRects:', eyeResult.objects);
         //   console.log('confidences:', eyeResult.numDetections);

             //
          

        //     const { objects, numDetections } = await classifier.detectMultiScaleAsync(grayImg);
        //     //...
        //   } catch (err) {
         //    console.error(err);
        //   }
          
        socket.emit("frame", {
            buffer: cv.imencode(".png", frame).toString("base64"), 
            data: faceResult.objects, 
            //dataEyes: eyeResult.objects 
        })
    }, camInterval)
}

// module.exports = function (socket) { 
//      setInterval(function() {
//         let frame=camera.read(); //const
//         // OPENCV ACTIONS 
//         // INterim to get it working with the image element added 
//         socket.emit("image", { 
//             buffer: cv.imencode(".png", frame).toString("base64")
//         });
//         // Original 
//         socket.emit("frame", { 
//             buffer: cv.imencode(".png", frame).toString("base64")
//         });
//     }, camInterval);
// }

// //const image = cv.imencode(".png", frame).toString('base64');
// //io.emit('image', image);
// //socket.emit('frame', image);
// //}, 1000)
// //console.log("reading camera");
// // opencv additinos here   
// //socket.emit("frame", jpeg_frame.toString('base64'));

// //const image1 = cv.imencode('.jpg', frame).toString('base64');
// //io.emit('image', image);
// //}, 1000)
        
//         // Encodes an image into a memory buffer
//         // convert Mat to base64 encoded jpg image
//         // JADWH const outBase64 =  cv.imencode('.jpg', croppedImage).toString('base64'); 
//         // return   cv.imencode('.jpg', img).toString('base64');
     