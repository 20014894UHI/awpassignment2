// const { HAAR_LEFTEYE_2SPLITS } = require('opencv4nodejs');
// // 
// //https://github.com/justadudewhohacks/opencv4nodejs/blob/master/lib/typings/constants.d.ts
// // lists export const HAAR_LEFTEYE_2SPLITS: string;
// // export const HAAR_RIGHTEYE_2SPLITS: string;

// const cv = require('opencv4nodejs');
// const mat = cv.imread('./img.jpg');
// cv.imwrite('./img.png', mat);
// const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
// const blue = new cv.Vec(255, 0, 0); 
// const thickness = 2; 

// cv.imreadAsync('./mona.jpg', (err, img) => { 
//     if (err) { return console.error(err);}
//     const grayImg = img.bgrToGray();
//     classifier.detectMultiScaleAsync(grayImg, (err, res) => {
//         if (err) { return console.error(err);}
//         const {objects, numDetections } = res; 
//         for (let i = 0; i < objects.length; i++) {
//             img.drawRectangle(
//                 new cv.Point(objects[i].x, objects[0].y),
//                 new cv.Point(objects[i].x + objects[i].width, objects[0].y + objects[i].height),
//                 blue, 
//                 cv.LINE_8, 
//                 thickness
//              )
//          }
//          cv.imwrite('./out.jpg', img);
//         })
//     });
    
    