const cv = require("opencv4nodejs");
const fs = require("fs");
const path = require("path");

// Show or hide glasses and moustache
let showGlasses = true;
let showMustache = true;
let showRectangles = true;

// The amount to trim/'crop' from the top and bottom after padding and rotating an image
// Useful when positioning close to frame borders as cannot overstep frame
const trimFactor = 0.25; // Would need to make sure this is < 1

// camera properties
const camWidth = 640;
const camHeight = 480;
const camFps = 10; // To do -
const camInterval = 1000 / camFps;

const transColor = new cv.Vec3(-255, 0, 0); //,255); // Tnansparent colour for padding etc.

const camera = new cv.VideoCapture(0);
camera.set(cv.CAP_PROP_FRAME_WIDTH, camWidth);
camera.set(cv.CAP_PROP_FRAME_HEIGHT, camHeight);

// 1. load pre-trained classifiers
haarNoseCascade = new cv.CascadeClassifier("./data/haarcascade_mcs_nose.xml");
haarMouthCascade = new cv.CascadeClassifier("./data/haarcascade_mcs_mouth.xml");
// haarCatCascade = new cv.CascadeClassifier('./data/haarcascade_frontalcatface.xml');

const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_DEFAULT);
// mona lisa: //const classifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);
// const eyeClassifier = new cv.CascadeClassifier(cv.HAAR_EYE);
const rightEyeClassifier = new cv.CascadeClassifier(cv.HAAR_RIGHTEYE_2SPLITS);
const leftEyeClassifier = new cv.CascadeClassifier(cv.HAAR_LEFTEYE_2SPLITS);
const eyePairClassifier = new cv.CascadeClassifier(
  "./data/haarcascade_mcs_eyepair_big.xml"
);
// Can also use HAAR_EYE to determine left right eye

const drawRect = (image, rect, color, opts = { thickness: 2 }) =>
  image.drawRectangle(rect, color, opts.thickness, cv.LINE_8);
const drawBlueRect = (image, rect, opts = { thickness: 2 }) =>
  drawRect(image, rect, new cv.Vec(255, 0, 0), opts);
const drawGreenRect = (image, rect, opts = { thickness: 2 }) =>
  drawRect(image, rect, new cv.Vec(0, 255, 0), opts);
const drawRedRect = (image, rect, opts = { thickness: 2 }) =>
  drawRect(image, rect, new cv.Vec(0, 0, 255), opts);
const drawCyanRect = (image, rect, opts = { thickness: 2 }) =>
  drawRect(image, rect, new cv.Vec(255, 255, 0), opts);
const drawYellowRect = (image, rect, opts = { thickness: 2 }) =>
  drawRect(image, rect, new cv.Vec(0, 255, 255), opts);
const drawMagentaRect = (image, rect, opts = { thickness: 2 }) =>
  drawRect(image, rect, new cv.Vec(255, 0, 255), opts);

// *** Load glasses image. -1 reads also alpha channel (if exists) // Or use cv.IMREAD_UNCHANGED);
// Loaded images have four channels (Blue, Green, Red, Alpha):
const glasses4Ch = cv.imread("./glassesalpha.png", -1);
const mustache4Ch = cv.imread("./mustache1.png", -1);

//console.log("glasses4Ch.type: ", glasses4Ch.type);
//console.log("glasses4Ch.channels", glasses4Ch.channels);

// *** Create the masks for the glasses and moustache
const glassesMask = glasses4Ch.threshold(30, 255, cv.THRESH_BINARY_INV);
const mustacheMask = mustache4Ch.threshold(30, 255, cv.THRESH_BINARY_INV);
//@cv.imwrite("./A1_glassesMask.jpg", glassesMask);
//@cv.imwrite("./A1_mustacheMask.jpg", mustacheMask);

// *** Convert images to BGR Blue Green Red (remove alpha channel):
//     https://docs.opencv.org/3.4/d8/d01/group__imgproc__color__conversions.html
const glassesBgr = glasses4Ch.cvtColor(cv.COLOR_BGRA2BGR);
const mustacheBgr = mustache4Ch.cvtColor(cv.COLOR_BGRA2BGR);
//@cv.imwrite("./B2_glassesBlueGreenRed.jpg", glassesBgr);
//@cv.imwrite("./B2_mustacheBlueGreenRed.jpg", mustacheBgr);

// **** Calculations on the glasses/moustache width and height to keep resizing proportionate regardless of the image used
const glassesRatio = glasses4Ch.cols / glasses4Ch.rows;
const mustacheRatio = mustache4Ch.cols / mustache4Ch.rows;

// Find a position that we can base the start position for the glasses at
function nudgeGlasses(gStart, fWidth, faceL, glWidth) {
  if (gStart >= faceL + fWidth * 0.15) {
    for (let i = gStart; (i = faceL + fWidth * 0.15); i--) {
      if (i == faceL + fWidth * 0.15) {
        return i;
      }
    }
  }
  if (gStart < faceL + fWidth * 0.15) {
    for (let i = gStart; (i = faceL + fWidth * 0.15); i++) {
      if (i == faceL + fWidth * 0.15) {
        return i;
      }
    }
  }
}

// Calculate the angle between two points
function calcAngleDegrees(p, q) {
  return (Math.atan2(q, p) * 180) / Math.PI;
}

// Calculate the angle of the line from a to b with respect to the positive X-axis in degrees
// Translated based on Python/Credit https://chidambaramsethu.wordpress.com/2015/01/11/angle-calculation-in-opencv/
function calcAngle(a, b) {
  let val = (b.y - a.y) / (b.x - a.x); // slope between a and b
  val = val - Math.pow(val, 3) / 3 + Math.pow(val, 5) / 5; // arc tan of the slope
  val = Math.round((val * 180) / 3.14) % 360; // Convert the angle in radians to degrees
  if (b.x < a.x) val += 180;
  if (val < 0) val = 360 + val;
  return val;
}

// Determine how much to tilt the glasses based on the angle
function calcTilt(angle) {
  let tilt = 0;
  if (angle < 180) tilt = 180 - angle;
  else if (angle >= 180) tilt = 180 - angle; 
  return tilt;
}

/* Get the centre of a rect
/* @param {cv.Rect} rectangle */
function calcRectCentre(rectangle) {
  let centrePoint = new cv.Point(
    Math.round(rectangle.x + rectangle.width / 2),
    Math.round(rectangle.y + rectangle.height / 2)
  );
  return centrePoint;
}

// Returns true if two rectangles (l1, r1) and (l2, r2) overlap
// Use to check if mouth overlaps left eye or right eye
function checkOverlap(ptLeft1, ptRight1, ptLeft2, ptRight2) {
  // If one rectangle is on left side of other
  if (ptLeft1.x > ptRight2.x || ptLeft2.x > ptRight1.x) return false;
  // If one rectangle is above other
  if (ptRight1.y > ptLeft2.y || ptRight2.y > ptLeft1.y) return false;
  return true;
}

function overlapVertically(ptTop1, ptBottom1) {
  if (ptBottom1.y < ptTop1.y) {
    return false;
  }
  return true;
}

// Check if a rect expected to be on the left is in fact on the left
// relative to a rect expected to be on its right
function rectsInSequenceLeftRight(rectOnRight, rectOnLeft) {
  if (
    rectOnRight.x < rectOnLeft.x ||
    rectOnRight.x + rectOnRight.width < rectOnLeft.x + rectOnLeft.width
  ) {
    return false;
  }
  return true;
}

// Check if a rectangle overlaps another on x axis
function rectOverlaps(rectOnLeft, rectOnRight) {
  if (rectOnLeft.x + rectOnLeft.width >= rectOnRight.x) {
    return true;
  }
  return false;
}

// Check if a rectangle fully inside a rectangle
function rectWithinRect(insideRect, outsideRect) {
  if (
    insideRect.x > outsideRect.x &&
    insideRect.cols < outsideRect.cols &&
    insideRect.y < outsideRect.y &&
    insideRect.cols < outsideRect.cols
  ) {
    return true;
  }
  return false;
}

// Check if a rectangle is leftmost or left lines overlap
function isLeftMost(r1, r2) {
  if (r1.x <= r2.x) return true;
  return false;
}

// Check boundaries of an region or rect x are wihtin the frame
function withinFrame(x, y, w, h, fw, fh) {
  if (!x || !y) {
    return false;
  } 
  if (x > fw || x < 0) {
    return false;
  }
  if (x + w > fw || x + w < 0) {
    return false;
  }
  if (y > fh || y < 0) {
    return false;
  }
  if (y + h < 0) {
    return false;
  }
  if (y + h * 2 >= fh) {
    return false;
  }

  return true;
}

// Try to get the glasses width from the relative nose position and width between
// the middle of the nose and the end of the eye
// Only sometimes effective so not worthwhile ...
function glassesWForEyesUsingNose(nose, noseMidx, lEyeTopRx, rEyeTopLx) {
  let estimatedGlassesWidth;
  if (nose && noseMidx < lEyeTopRx) {
    estimatedGlassesWidth = Math.round(2 * (lEyeTopRx - noseMidx));
  } else if (nose && noseMidx > rEyeTopLx) {
    estimatedGlassesWidth = Math.round(2 * (noseMidx - rEyeTopLx));
  }
  return estimatedGlassesWidth;
}

function glassesWForEyesUsingNoseLE(nose, noseMidx, lEyeTopRx) {
  let estimatedGlassesWidth;
  if (nose && noseMidx < lEyeTopRx) {
    estimatedGlassesWidth = Math.round(2 * (lEyeTopRx - noseMidx));
  }
  return estimatedGlassesWidth;
}

function glassesWForEyesUsingMouth(mouth, mouthMidx, lEyeTopRx, rEyeTopLx) {
  if (mouth && mouthMidx < lEyeTopRx) {
    estimatedGlassesWidth = Math.round(2.2 * (lEyeTopRx - mouthMidx));
  } else if (mouth && mouthMidx > rEyeTopLx) {
    estimatedGlassesWidth = Math.round(2 * (mouthMidx - rEyeTopLx));
  }

  return estimatedGlassesWidth;
}

// Better performance than copyTo to place the glasses on the regionGlasses
// Credit: Gavin https://stackoverflow.com/a/57716197/19318647 in
// https://stackoverflow.com/questions/57699414/how-to-set-a-matrix-region-with-opencv4nodejs
/* Places a source matrix onto a dest matrix.
 * Note: This replaces pixels entirely, it doesn't merge transparency
 * @param {cv.Mat} source_mat matrix being copied
 * @param {cv.Mat} dest_mat matrix being pasted into
 * @param {number} x horizontal offset of source image
 * @param {number} y vertical offset of source image
 */

function overlayOnto(source_mat, dest_mat, x, y) {
  if (source_mat.channels != dest_mat.channels)
    throw new Error("src and dst channel counts must match");
  let source_uint8 = new Uint8Array(source_mat.getData()); // WARNING 4 CHANNELS
  let dest_uint8 = new Uint8Array(dest_mat.getData()); // WARNING 4 CHANNELS
  let dest_width = dest_mat.cols;
  let x_count = 0; // set counters
  let y_count = 0; // set counters
  let channel_count = source_mat.channels;
  for (let i = 0; i < source_uint8.length; i += channel_count) {
    // WARNING 4 CHANNELS
    let dest_x = x_count + x; // add offset
    let dest_y = y_count + y; // add offset

    if (
      !(
        dest_x < 0 ||
        dest_x > dest_mat.cols - 1 ||
        dest_y < 0 ||
        dest_y > dest_mat.rows - 1
      )
    ) {
      // pixel does not fall outside of dest mat
      // write into buffer array
      let dest_i = dest_x + dest_width * dest_y; // (x + w * h) to get x/y coord in single-dimension array
      let dest_buffer_i = dest_i * channel_count;
      if (channel_count >= 1)
        dest_uint8.fill(
          source_uint8[i + 0],
          dest_buffer_i + 0,
          dest_buffer_i + 0 + 1
        );
      if (channel_count >= 2)
        dest_uint8.fill(
          source_uint8[i + 1],
          dest_buffer_i + 1,
          dest_buffer_i + 1 + 1
        );
      if (channel_count >= 3)
        dest_uint8.fill(
          source_uint8[i + 2],
          dest_buffer_i + 2,
          dest_buffer_i + 2 + 1
        );
      if (channel_count >= 4)
        dest_uint8.fill(
          source_uint8[i + 3],
          dest_buffer_i + 3,
          dest_buffer_i + 3 + 1
        );
    }
    x_count++; // increase col
    x_count = x_count % source_mat.cols; // end of col? move to start
    if (x_count == 0) y_count++; // started new col? increase row
  }
  //return new cv.Mat(dest_uint8, dest_mat.rows, dest_mat.cols, dest_mat.type);
  imgWithOverlay = new cv.Mat(
    dest_uint8,
    dest_mat.rows,
    dest_mat.cols,
    dest_mat.type
  );
  return imgWithOverlay;
}

module.exports = function (socket) {
  socket.on("showHideGlasses", function () {
    showGlasses = !showGlasses;
  });

  socket.on("showHideMustache", function () {
    showMustache = !showMustache;
  });

  socket.on("showHideRectangles", function () {
    showRectangles = !showRectangles;
  });

  setInterval(function () {
    let frame = camera.read();
    const grayFrame = frame.bgrToGray(); // Convert frame to grey scale
    //const faceResult = classifier.detectMultiScale(grayFrame);
    const faceResult = classifier.detectMultiScale(grayFrame, {
      scaleFactor: 1.2,
      minSize: new cv.Size(100, 100),
    });

    // const catResult = haarCatCascade.detectMultiScale( grayFrame);
    // if (catResult.objects.length > 0) {
    //     const catFaceRect = catResult.objects[0];
    //     const catFaceRegion = frame.getRegion(catFaceRect);
    //     drawCyanRect(frame, catFaceRect); console.log("catResult", catResult);
    // }

    // if (!faceResult.objects.length) {//     throw new Error ('No faces detected'); // }
    const sortByNumDetections = (result) =>
      result.numDetections
        .map((num, idx) => ({ num, idx }))
        .sort((n0, n1) => n1.num - n0.num)
        .map(({ idx }) => idx);
    if (faceResult.objects.length > 0) {
      // const faceRect = faceResult.objects[sortByNumDetections(faceResult)[0]];
      const faceRect = faceResult.objects[0];
      const faceWidth = faceRect.width;
      if (showRectangles == true) drawBlueRect(frame, faceRect);
      // Create the ROIS
      const grayFaceRegion = grayFrame.getRegion(faceRect); // Grey
      const faceRegion = frame.getRegion(faceRect);
      // Example data:
      // faceRegion Mat {step: 1920,elemSize: 3,sizes: [ 190, 190 ],empty: 0,depth: 0, dims: 2,channels: 3,type: 16,cols: 190,rows: 190}

      // Detect the eyes - experimented with individual haar_eye, left, right and pair
      // const eyeResult = eyeClassifier.detectMultiScale(grayFaceRegion); // HAAR_EYE
      const eyePairResult = eyePairClassifier.detectMultiScale(grayFaceRegion);
      const rightEyeResult = rightEyeClassifier.detectMultiScale(grayFaceRegion); 
      const leftEyeResult = leftEyeClassifier.detectMultiScale(grayFaceRegion); 
      // const noseClassifier = new cv.CascadeClassifier(haarNoseCascade);
      // const noseResult = haarNoseCascade.detectMultiScale( faceRegion, noses, 1.1, 2, 0|CV_HAAR_SCALE_IMAGE, Size(30, 30));
      const noseResult = haarNoseCascade.detectMultiScale(grayFaceRegion);
      const mouthResult = haarMouthCascade.detectMultiScale(grayFaceRegion);

      // *** Height of the glassses is a fraction of the face region
      const glassesProportionateRows = Math.round(faceRegion.rows / 3.5);
      const mustacheProportionateRows = Math.round(faceRegion.rows / 8);
      // *** Use ratio to keep resized image in proportion
      const glassesProportionateColumns = Math.round(
        glassesProportionateRows * glassesRatio
      );
      const mustacheCols = Math.round(
        mustacheProportionateRows * mustacheRatio
      );
      // *** Resize the mask to size of region where the glasses will be placed
      const resizedMustacheMask = mustacheMask.resize(
        Math.round(mustacheProportionateRows / mustacheRatio),
        Math.round(mustacheProportionateRows)
      );
      //@cv.imwrite("./C_ResizedMustacheMask.jpg", resizedMustacheMask);
      // *** Create the inverse of the resized mask
      const mustacheMask_inv = resizedMustacheMask.bitwiseNot();
      //@cv.imwrite("./D_MustacheMask_inv.jpg", mustacheMask_inv);
      // *** Resize to the desired size: resize the BGR one
      const resizedMustacheBGR = mustacheBgr.resize(
        mustacheProportionateRows,
        mustacheCols
      );
      //@cv.imwrite("./E_ResizedMustacheBlueGreenRed.jpg", resizedMustacheBGR);

      let ptMustacheTL,
        anyEye,
        eyePairRect,
        eyePairEndMiddleR,
        eyePairEndMiddleL,
        mouthRect,
        leftEyeRect,
        rightEyeRect,
        noseRect;
      let nose, mouthDetected, leftEye, eyePair, rightEye;
      let eyeOverlapsMouth,
        noseAboveMouth,
        lEyeOverlapsMouth,
        eyePairOverlapsMouth,
        isTilted,
        rEyeOverlapsMouth = false;
      let leftEyeRelativeToRight = false;
      let ptNoseTopL,
        noseWidth,
        eyePairWidth,
        ptNoseMiddle,
        ptMouthTopL,
        ptMouthTopR,
        mouthWidth,
        ptMouthTopMiddle,
      //  ptEyePairTopL,
        ptEyePairBottomL,
        ptEyePairTopR,
        ptRightEyeBottomL,
        ptLeftEyeTopL,
        ptLeftEyeTopR,
        ptLeftEyeBottomL,
        lEyeWidth,
        rEyeWidth,
        lEyeMiddle,
        ptRightEyeTopR,
        ptRightEyeTopL,
        glassesOffset;
      let eyeRotation = 0;
      let glassesWidth = 0;
      var eyes_and_glasses = [];
      var face_and_mustache = [];
      let glassesTopLx, glassesTopLy; 

      // ************************
      // EYE PAIR TOGETHER // Most light sensitive / dependent
      // ************************
      if (eyePairResult.objects.length > 0) {
        eyePair = true;
        anyEye = true;
        eyePairRect =
          eyePairResult.objects[sortByNumDetections(eyePairResult)[0]];
        eyePairWidth = eyePairRect.width;
        eyePairHeight = eyePairRect.height;
        //ptEyePairTopL = new cv.Point(eyePairRect.x + eyePairWidth,eyePairRect.y);
        ptEyePairTopR = new cv.Point(eyePairRect.x +eyePairRect.width, eyePairRect.y);
        ptEyePairBottomL = new cv.Point(
          eyePairRect.x + eyePairWidth,
          eyePairRect.y - eyePairRect.height
        );
        eyePairEndMiddleR = new cv.Point(
          eyePairRect.x + eyePairWidth,
          eyePairRect.y - eyePair.height / 2
        );
        eyePairEndMiddleL = new cv.Point(
          eyePairRect.x,
          eyePairRect.x - eyePair.height / 2
        );
        if (showRectangles == true) drawMagentaRect(faceRegion, eyePairRect);
      }

      // Right eye (appears on left)
      if (rightEyeResult.objects.length > 0) {
        rightEye = true;
        anyEye = true;
        rightEyeRect =
          rightEyeResult.objects[sortByNumDetections(rightEyeResult)[0]];
        if (showRectangles == true) drawRedRect(faceRegion, rightEyeRect);
        rEyeWidth = rightEyeRect.width;
        rEyeHeight = rightEyeRect.height;
        ptRightEyeBL = new cv.Point(rightEyeRect.x, rightEyeRect.y);
        ptRightEyeTopL = new cv.Point(rightEyeRect.x, rightEyeRect.y);
        ptRightEyeTopR = new cv.Point(
          ptRightEyeTopL.x + rightEyeRect.width,
          rightEyeRect.y
        );
        ptRightEyeBottomL = new cv.Point(
          rightEyeRect.x,
          rightEyeRect.y + rightEyeRect.height
        );
        ptRightEyeBottomR = new cv.Point(
          rightEyeRect.x + rightEyeRect.width,
          rightEyeRect.y - rightEyeRect.height
        );
        rEyeMiddle = calcRectCentre(rightEyeRect);
      }

      // Left eye (appears on right)
      if (leftEyeResult.objects.length > 0) {
        leftEye = true;
        anyEye = true;
        leftEyeRect =
          leftEyeResult.objects[sortByNumDetections(leftEyeResult)[0]];
        if (showRectangles == true) drawCyanRect(faceRegion, leftEyeRect);
        lEyeWidth = leftEyeRect.width;
        ptLeftEyeTopL = new cv.Point(leftEyeRect.x, leftEyeRect.y);
        //  ptLeftEyeBottomL = new cv.Point(ptLeftEyeTopL.x, ptLeftEyeTopL.y - leftEyeRect.height);
        ptLeftEyeBottomL = new cv.Point(
          ptLeftEyeTopL.x,
          ptLeftEyeTopL.y + leftEyeRect.height
        );

        ptLeftEyeTopR = new cv.Point(leftEyeRect.x + lEyeWidth, leftEyeRect.y);
        lEyeMiddle = calcRectCentre(leftEyeRect);
      }

      // Mouth
      if (mouthResult.objects.length > 0) {
        mouthDetected = true;
        mouthRect = mouthResult.objects[sortByNumDetections(mouthResult)[0]];
        if (showRectangles == true) drawGreenRect(faceRegion, mouthRect);
        ptMouthTopL = new cv.Point(mouthRect.x, mouthRect.y);
        mouthWidth = mouthRect.width;
        ptMouthTopR = new cv.Point(mouthRect.x + mouthWidth, mouthRect.y);
        ptMouthTopMiddle = new cv.Point(
          ptMouthTopL.x + mouthWidth / 2,
          ptMouthTopR.y
        );
        ptMouthMiddle = calcRectCentre(mouthRect);

        // If mouth overlaps left or right eye or eye pair not reliable
        if (leftEye) {
          lEyeOverlapsMouth = overlapVertically(ptMouthTopL, ptLeftEyeBottomL);
        }
        if (rightEye) {
          rEyeOverlapsMouth = overlapVertically(ptMouthTopL, ptRightEyeBottomL);
        }
        if (eyePair) {
          eyePairOverlapsMouth = overlapVertically(
            ptMouthTopL,
            ptEyePairBottomL
          );
        }
        if (lEyeOverlapsMouth || rEyeOverlapsMouth || eyePairOverlapsMouth) {
          eyeOverlapsMouth = true;
          mouthDetected = false;
        }
      }

      // Nose - Yellow
      if (noseResult.objects.length > 0) {
        nose = true;
        noseRect = noseResult.objects[sortByNumDetections(noseResult)[0]];
        if (showRectangles == true) drawYellowRect(faceRegion, noseRect);
        ptNoseTopL = new cv.Point(noseRect.x, noseRect.y);
        noseHeight = noseRect.height;
        noseWidth = noseRect.width;
        ptNoseTopR = new cv.Point(noseRect.x + noseWidth, noseRect.y);
        ptNoseMiddle = calcRectCentre(noseRect);
      }

      // Calculate padding - for adding borders to the image later so that the image will not be
      // cropped in the rotation step
      // References for this approach and another suitable one:
      // Kaan E. in OpenCV Python : rotate image without cropping sides https://stackoverflow.com/a/47290920/19318647 in https://stackoverflow.com/questions/43892506/opencv-python-rotate-image-without-cropping-sides
      const diagonalGlassesSquare =glassesProportionateColumns * glassesProportionateColumns +glassesProportionateRows * glassesProportionateRows;
      const diagonalGlasses = Math.round(Math.sqrt(diagonalGlassesSquare));
      const paddingGlassesT = Math.round((diagonalGlasses - glassesProportionateRows) / 2);
      const paddingGlassesB = Math.round((diagonalGlasses - glassesProportionateRows) / 2);
      const paddingGlassesR = Math.round((diagonalGlasses - glassesProportionateColumns) / 2);
      const paddingGlassesL = Math.round((diagonalGlasses - glassesProportionateColumns) / 2);

      const diagonalMustacheSquare =mustacheCols * mustacheCols +mustacheProportionateRows * mustacheProportionateRows;
      const diagonalMustache = Math.round(Math.sqrt(diagonalMustacheSquare));
      const paddingMustacheT = Math.round((diagonalMustache - mustacheProportionateRows) / 2 );
      const paddingMustacheB = Math.round((diagonalMustache - mustacheProportionateRows) / 2);
      const paddingMustacheR = Math.round((diagonalMustache - mustacheCols) / 2);
      const paddingMustacheL = Math.round((diagonalMustache - mustacheCols) / 2);

      /*******************************************************/
      /* Evaluate scenarios depending on what is detected   */
      if (showGlasses == true) {
        //glassesWidth = Math.round(faceWidth * .7); // fallback where no better alternative
        if (!faceRect) {
          console.log("Face not detected this frame");
        }
        if (faceRect && !anyEye) {
          console.log("Eyes not detected in face this frame");
        }

        // ************************
        // * 1. Left eye and right eye detected *****/
        // ************************
        else if (leftEye && rightEye) {
          console.log("1. Left and right eye");
          leftEyeRelativeToRight = rectsInSequenceLeftRight(
            leftEyeRect,
            rightEyeRect
          );
          const eyesOverlap = rectOverlaps(rightEyeRect, leftEyeRect);
          // let containsLR = leftEyeRect.area + rightEyeRect.area == leftEyeRect.area;
          console.log("eyesOverlap", eyesOverlap);
          if (leftEyeRelativeToRight && !eyesOverlap) {
            //     if (lEyeMiddle.x > rEyeMiddle.x) {
            console.log("1.1. relative positions ok and eyes not overlapping");
            middleEyeToEyeDistance = lEyeMiddle.x - rEyeMiddle.x;
            glassesOffset = Math.round(
              (ptLeftEyeTopL.x - ptRightEyeTopR.x) * 0.7
            );
            middleEyeToEyeDistance = lEyeMiddle.x - rEyeMiddle.x;
            // calculate the point between the eyes along a plane from rEyeRect.y
            middleBetwEyes = new cv.Point(
              Math.round(rEyeMiddle.x + (lEyeMiddle.x - rEyeMiddle.x) / 2),
              ptRightEyeTopL.y
            );
            console.log("       1.1.2. Determine rotation and positions");
            eyeRotation = calcTilt(calcAngle(lEyeMiddle, rEyeMiddle)); // eye appearing on R, eye appearing on L
            console.log("          Eye rotation", eyeRotation);
            glassesWidth = ptLeftEyeTopR.x - ptRightEyeTopL.x;

            glassesHeight = Math.round(glassesWidth / glassesRatio);
            glassesTopLx = Math.round(ptRightEyeTopL.x - glassesOffset);
            // To refine this - tweak to use eye centre as a extra cue to position the glasses in this case
            // Put the eye centre in the middle of the glasses y - removed initial trials that were not working
            // The rotation padding also affects this
            // glassesTopLy = faceRect.y - (rEyeMiddle.y - Math.round(glassesHeight/2) - paddingGlassesT);
            // glassesTopLy = Math.round(faceRect.y + ptRightEyeTopL.y + (rEyeHeight/2)- paddingGlassesT);
            glassesTopLy = Math.round(
              faceRect.y + ptRightEyeTopL.y - paddingGlassesT
            );
          }
          // Left & RE in correct sequence but they overlap
          // Or not in sequence but eyePair available
          else if (
            (leftEyeRelativeToRight && eyesOverlap && eyePair) ||
            (!leftEyeRelativeToRight && eyePair)) {
            console.log("        1.2. Fallback left eye and right eye not in position but eye pair ");
            glassesWidth = eyePairWidth;
            // glassesOffset = Math.round((ptLeftEyeTopR.x - ptLeftEyeTopL.x) * 0.7); //- leftEyeRect/2;
            glassesOffset = Math.round(rEyeWidth / 2);
            if (
              ptEyePairTopR.x > ptLeftEyeTopR.x &&
              ptEyePairTopR.x > ptRightEyeTopR.x
            ) {
              console.log(
                "          1.2.1 eye pair further over than both LE and RE detected"
              );
              //  eye pair is further over than both eyes and both eyes on left
              eyeRotation = calcTilt(calcAngle(eyePairEndMiddleR, lEyeMiddle));
              glassesTopLx = Math.round(eyePairRect.x - glassesOffset);
              // below from 1.2.2. would seem more logical but above seems less jumpy
              // Seems to have a better transition between frames when it's jumping between the two alternatives....
              // glassesTopLx = Math.round(faceRect.x + ptRightEyeTopL.x - glassesOffset);
              glassesTopLy = Math.round(faceRect.y - eyePairHeight / 3); // + paddingGlassesT);
              // glassesTopLy = Math.round(faceRect.y + ptRightEyeTopL.y - paddingGlassesT);
            } else if (ptEyePairTopR.x < ptLeftEyeTopR.x) {
              console.log("         1.2.2 Left eye further over");
              // left eye is further over (appears on right )
              eyeRotation = calcTilt(calcAngle(lEyeMiddle, eyePairEndMiddleL));
              //glassesTopLx = Math.round(faceRect.x + ptRightEyeTopL.x - glassesOffset);
              if (ptRightEyeTopL.x < eyePairRect.x) {
                // To improve this: Startign point could be based on Middle between eye pair rect and right eye rect r.x then subtract half the glasses width from that
                glassesTopLx = Math.round(eyePairRect.x);
                // subtracting the offset nudges it over a bit too much with small faces
              }
              glassesTopLx = Math.round(eyePairRect.x - glassesOffset);
              glassesTopLy = Math.round(faceRect.y - eyePairHeight / 3); // + paddingGlassesT);
            }
          }
          // If eyes in sequence + overlapping + no eyePair
          // Also no useful rotation information available
          else if (
            (leftEyeRelativeToRight && eyesOverlap && !eyePair) ||
            (!leftEyeRelativeToRight && !eyePair)
          ) {
            console.log(
              "1.3. (b) LE/RE ARE LE in sequence, BUT overlap AND no eye pair "
            );
            console.log(
              "     (a) LE and RE not in correct relative position, no eye pair "
            );
            // If the left eye rect is too big, width of the glasses will be too big
            // May not fit on the frame when the face is to the right (probably also left)

            // Nose to the rescue to aid with width of glasses
            // But it must be on the right side of the left eye
            // Avoid negative evaluations for projected eye width

            // if (nose) {
            //   glassesWidth = glassesWForEyesUsingNose(
            //   nose, ptNoseMiddle.x, ptLeftEyeTopR.x, ptRightEyeTopL.x)
            //   console.log("  glasses Width based on nose", glassesWidth);

            // }
            // else if (mouthDetected) {
            //   glassesWidth = glassesWForEyesUsingMouth(
            //   mouthDetected, ptMouthTopMiddle.x, ptLeftEyeTopR.x, ptRightEyeTopL.x)
            //   console.log("  glasses width based on mouth", glassesWidth);
            // }
            // // not good...
            // else if (!nose && (lEyeWidth * 2 > faceWidth)) {
            //   glassesWidth = Math.round(faceWidth *.6);
            //   console.log("  glasses width based on face width", glassesWidth);
            // }
            // else //{ if (!nose && (lEyeWidth * 2 > faceWidth))
            // {
            //     glassesWidth = Math.round(lEyeWidth * 1.8);
            //     console.log("  glasses Width based on left eye width", glassesWidth);
            // }

            glassesWidth = Math.round(faceWidth * 0.7);

            //if left eye in r eye work back from left eye
            // This doesn't really work , the rectangles can be contained
            // on either side...
            if (nose) {
              if (ptRightEyeTopR.x < ptLeftEyeTopR.x && (ptRightEyeTopL.x > ptLeftEyeTopL.x) &
                  (ptNoseTopL.x < ptLeftEyeTopL.x)
              ) {
                // position from 'left' eye'
                glassesTopLx = Math.round(ptLeftEyeTopR.x - glassesWidth);
                console.log("     position from 'left' eye");
              }
              //  else if (ptLeftEyeTopR.x > ptRightEyeTopR.x) { // position from 'left' eye'
              //   glassesTopLx = Math.round(faceRect.x + ptLeftEyeTopR.x - glassesWidth);
              // glassesTopLx = Math.round(faceRect.x + ptRightEyeTopL.x);
              //   console.log("position from 'right ' eye");
              //  }
              // position fromright  eye
              else {
                glassesTopLx = Math.round(ptRightEyeTopL.x);
              }
            } else glassesTopLx = Math.round(faceRect.x); // glassesTopLx = Math.round(faceRect.x + ptLeftEyeTopR.x - glassesWidth);

            // position to nudge glasses to with uncertain width and position information
            // nudge them so not placed outside the face rect
            // let eTopLxNudged = Math.round(nudgeGlasses (faceRect.x, faceWidth, faceRect.x, glassesWidth));
            // glassesTopLx = eTopLxNudged;
            glassesTopLx = Math.round(faceWidth * 0.1);
            glassesWidth = faceWidth * 0.7;
            glassesTopLy = Math.round(ptLeftEyeTopL.y - (leftEyeRect.height*1.5));
            //  if (nose && overlapVertically(ptNoseTopL, ptRightEyeTopL)|| mouthDetected
            //     && overlapVertically(ptMouthTopL, ptRightEyeTopL))
            //  {
            //   glassesOffset = Math.round(lEyeWidth/2);
            // Work back from end of left eye

            // If right eye overlaps the nose or mouth it is unreliable
            // if (nose  && overlapVertically(ptNoseTopL, ptRightEyeTopL)|| mouthDetected && overlapVertically(ptMouthTopL, ptRightEyeTopL))
            // {
            //   glassesOffset = Math.round(lEyeWidth/2);
            //   // Work back from end of left eye
            //   let glassesPositionR = leftEyeRect.x + lEyeWidth;
            //   console.log("   Glasses right at", glassesPositionR);
            //   console.log("   Glasses left  at", Math.round(glassesPositionR - glassesWidth));
            //   glassesTopLx = Math.round(faceRect.x + glassesPositionR - glassesWidth);
            //  // glassesTopLx = Math.round(faceRect.x + ptLeftEyeTopL.x);
            //   //     glassesTopLx = Math.round(faceRect.x + ptLeftEyeTopL.x - glassesOffset);
            //   glassesTopLx = Math.round(faceRect.x + ptLeftEyeTopL.x);
            //   console.log("     glassesTopLx (faceRect.x + ptLeftEyeTopL.x)", glassesTopLx);}
            // else {
            //   glassesOffset = Math.round(rEyeWidth/2);
            console.log(
              "   glasses out of range?",
              glassesTopLx + glassesWidth > frame.cols
            );
            console.log("   No reliable information for rotating");
            //if (ptEyePairTopR.x > ptLeftEyeTopR.x && ptEyePairTopR.x > ptRightEyeTopR.x) {
            // eyeRotation = calcTilt(calcAngle(eyePairEndMiddleR, lEyeMiddle));
          }
        }
        // *****************
        // 2. EYE PAIR BUT EITHER NO RIGHT EYE OR LEFT EYE - unlikely scenario...
        // ****************
        else if (eyePair && nose && (!rightEye || !leftEye)) {
          console.log("2. Eye pair only");
          glassesWidth = eyePairWidth;
          glassesOffset = Math.round(noseWidth / 2);
          console.log("        glassesOffset", glassesOffset);
          eyeRotation = calcTilt(calcAngle(eyePairRect.x, ptEyePairTopR));
          // Correct one below, from top right to top left
          // But no need to do the calculation in this case and can just set to 0
          //eyeRotation = 0;
          console.log("         Eye rotation", eyeRotation); // Expect to be 0 as all points in the eyePair rect
          // could just set rotation to 0;
          // Middle of glasses should be over middle of nose / middle of eyePair
          glassesTopLx = eyePairRect.x - glassesOffset;
          // Typically the eyePair rect is < half the height of the single corolloary
          // glassesTopLy = Math.round(eyePairRect.y + paddingGlassesT + (eyePairHeight/3*1));
          glassesTopLy = Math.round(eyePairRect.y + (eyePairRect.height));

        }
        // **************
        // End 2. EYE PAIR specific segment
        // *****************

        // *****************
        // 3. Left eye - cyan - appears on right
        // ****************
        else if (leftEye && (!eyePair || !rightEye)) {
          // Nose not a good indicator  in this scenario as can be over to the side
          console.log("3. Left eye only (cyan)");
          // glassesWidth = Math.round(lEyeWidth * 2.5);
          glassesOffset = Math.round(lEyeWidth / 2);
          console.log("  No rotation");
          // eyeRotation = calcTilt(calcAngle(eyePairEndMiddleR, lEyeMiddle));
          // positioning cue from the nose
          // if (nose) {
          //   console.log("3. Using nose also as positioning cue");
          //   console.log(glassesProportionateColumns/2);
          //   glassesTopLx = Math.round(faceRect.x + ptNoseMiddle.x - (glassesProportionateColumns/2));
          // }
          // else {glassesTopLx = Math.round(faceRect.x + glassesOffset);}

          // Nose to the rescue to aid with width of glasses
          // Doesn't matter about any vertical overlap, at least for the x value ...
          // But it must be on the right side of the left eye
          // Avoid negative evaluations for projected eye width

          // This turns out not to be very effective with variants
          // if (nose) {
          //   glassesWidth = glassesWForEyesUsingNoseLE(
          //   nose, ptNoseMiddle.x, ptLeftEyeTopR.x, (ptNoseMiddle.x +1))
          // }
          // else if (mouthDetected) {
          //   glassesWidth = glassesWForEyesUsingMouth(
          //   mouthDetected, ptMouthTopMiddle.x, ptLeftEyeTopR.x,
          //   (ptMouthMiddle.x +1)) // Don't have right eye so make it larger
          //   console.log("  glasses width based on mouth", glassesWidth);
          // }
          // not good...
          //else
          // {
          //     glassesWidth = Math.round(lEyeWidth * 1.8);
          // }
          glassesTopLy = Math.round(faceRect.y - leftEyeRect.height / 3); // + paddingGlassesT);
        }

        // *****************
        // 4. Right Eye - red - appears on left side
        // ****************
        else if (rightEye && (!eyePair || !leftEye)) {
          //    else if (leftEye && nose && (!eyePair || !rightEye)) {
          // Nose not a good indicator  in this scenario as can be over to the side
          // To do reuse other method
          console.log("4. Right eye only (red)");
          glassesWidth = Math.round(rEyeWidth * 2.5);
          glassesOffset = Math.round(rEyeWidth / 2);
          console.log("   No rotation");
          //  eyeRotation = calcTilt(calcAngle(eyePairEndMiddleR, lEyeMiddle));
          glassesTopLx = Math.round(rightEyeRect.x - glassesOffset);
          //let eTopLxNudged = Math.round(nudgeGlasses (rightEyeRect.x - glassesOffset, faceWidth, faceRect.x, glassesWidth));
          //console.log("nudging"); 
          //glassesTopLx = eTopLxNudged;
          glassesTopLy = Math.round(faceRect.y - rightEyeRect.height / 3); // + paddingGlassesT);
        }

        // **************
        // END Joint logic for right eye only and left EYE only
        // ******************************

        // Common block for all scenarios
        if (anyEye && !glassesWidth) {
          ("Error: glasses width is undefined");
        } else if (anyEye && glassesWidth && glassesWidth < 0) {
          ("Error: glasses width is undefined or < 0");
        } else if (anyEye && glassesWidth == 0) {
          ("Error: glasses width cannot be 0");
        } else if (anyEye && glassesWidth && glassesWidth !== 0) {
          resizedGlassesMask = glassesMask.resize(
            Math.round(glassesWidth / glassesRatio),
            Math.round(glassesWidth)
          );
          //@cv.imwrite("./C_resizedGlassesMask.jpg", resizedGlassesMask);
          glassesMask_inv = resizedGlassesMask.bitwiseNot();
          //@cv.imwrite("./D_GlassesMask_inv.jpg", glassesMask_inv);
          resizedGlassesBGR = glassesBgr.resize(
            glassesProportionateRows,
            glassesProportionateColumns
          );
          //@cv.imwrite("./E_resizedGlassesBlueGreenRed.jpg", resizedGlassesBGR);
        }
        // console.log("1.2..1 determine rotation and positions");
        // Tilt is only useful if the right eye and left eye are in correct position relative to each other

        if (anyEye && glassesWidth > 0) {
          glassesTopLx = faceRect.x + glassesTopLx;
          const glassesWithinFrame = withinFrame(
            glassesTopLx,
            glassesTopLy,
            glassesProportionateColumns,
            glassesProportionateRows,
            frame.cols,
            frame.rows
          );
          if (glassesTopLy > 0 && glassesTopLx > 0 && glassesWithinFrame) {
            // Create a padded image by adding a border to the resized glasses blue green red mat
            const paddedResizedGlassesBGRchannels = resizedGlassesBGR.copyMakeBorder(
              paddingGlassesT,paddingGlassesB,paddingGlassesL,paddingGlassesR,cv.BORDER_CONSTANT,transColor);
            const paddedGlassesHeight = paddedResizedGlassesBGRchannels.rows;
            const paddedGlassesWidth = paddedResizedGlassesBGRchannels.cols;
            paddedGlassesHeightTrimmed = paddedGlassesHeight * (1 - trimFactor * 2);

            // Take ROI from the BGR image:
            // This is the original position that is now not valid const regionGlasses = frame.getRegion(new cv.Rect(Math.round(glassesTopLx),Math.round(glassesTopLy),glassesProportionateColumns, glassesProportionateRows));
            // const regionGlasses = frame.getRegion(new cv.Rect(Math.round(faceRect.x + rightEyeRect.x*.8),Math.round(faceRect.y + rightEyeRect.y),glassesProportionateColumns, glassesProportionateRows));

            // ROI to correspond to rotated image
            // Original ROI - reflects the padding used to prevent 'cropping' of rotated mat
            const regionGlassesPadded = frame.getRegion(
              new cv.Rect(
                Math.round(glassesTopLx),
                Math.round(glassesTopLy),
                paddedGlassesWidth,
                paddedGlassesHeight
              )
            );
            // More optimized ROI - the above ROI is a square. But we never need the full square space.
            // We dont' have reliable rotation of more than +/-24 degrees.
            // SO we only need enough space to handle rotations within that range.
            // the padding used to prevent 'cropping' of rotated mat
            const regionGlassesPaddedCropped = frame.getRegion(
              new cv.Rect(
                Math.round(glassesTopLx),
                Math.round(glassesTopLy + paddedGlassesHeight * trimFactor),
                paddedGlassesWidth,
                paddedGlassesHeightTrimmed
              )
            );

            // To show the cut out section of the frame with visualisations
            //@cv.imwrite("./F_regionGlassesPadded.jpg", regionGlassesPadded);
            //@cv.imwrite("./F_regionGlassesPaddedCropped.jpg",regionGlassesPaddedCropped);

            // Create background
            const regionGlassesBgPadded = regionGlassesPadded.bitwiseAnd(
              regionGlassesPadded,glassesMask_inv);
            const regionGlassesBgPaddedCropped = regionGlassesPaddedCropped.bitwiseAnd(
              regionGlassesPaddedCropped,glassesMask_inv);
            // Create foreground
            const regionGlassesBGR_FG = resizedGlassesBGR.bitwiseAnd(
              resizedGlassesBGR,resizedGlassesMask);
            const regionGlassesBGR_FGCropped = resizedGlassesBGR.bitwiseAnd(
              resizedGlassesBGR,resizedGlassesMask);

            // const regionGlassesBg = regionGlasses.bitwiseAnd(regionGlasses, glassesMask_inv);
            ////@cv.imwrite("./G_regionGlassesBg.jpg", regionGlassesBg);
            //@cv.imwrite("./G_regionGlassesBgPadded.jpg", regionGlassesBgPadded);
            //@cv.imwrite("./G_regionGlassesBgPaddedCropped.jpg",regionGlassesBgPaddedCropped);
            //@cv.imwrite("./H_regionGlassesBgr_Fg.jpg", regionGlassesBGR_FG);
            //@cv.imwrite("./h_regionGlassesBgr_FgCropped.jpg",regionGlassesBGR_FGCropped);
            // const regionGlassesBGR_FGPadded = resizedGlassesBGR.bitwiseAnd(resizedGlassesBGR, resizedGlassesMask);

            // Rotation transformation Matrix using the middle of the glasses and the rotation angle
            // Transform_matrix
            const rotMatGlassesPaddedTM = cv.getRotationMatrix2D(
              new cv.Point(Math.round(paddedGlassesHeight / 2),Math.round(paddedGlassesWidth / 2)),
              eyeRotation);

            // Older items - will lead to cropping
            // const rotMatGlasses = cv.getRotationMatrix2D(  new cv.Point(glassesProportionateColumns / 2, glassesProportionateRows / 2),eyeRotation);
            // const rotatedGlasses = resizedGlassesBGR.warpAffine(rotMatGlasses);

            // const rotatedGlassesPaddedV2 = paddedResizedGlassesBGRchannels.warpAffine(rotMatGlassesPaddedTM,(new cv.Size(diagonalGlasses, diagonalGlasses)),cv.INTER_LANCZOS4, cv.BORDER_CONSTANT,transColor);
            // console.log("rotMatGlassesPaddedTM channels", rotMatGlassesPaddedTM.channels);

            const rotatedGlassesPadded = paddedResizedGlassesBGRchannels.warpAffine(
              rotMatGlassesPaddedTM
            );

            // ***** Crop rotatedGlassesPadded
            // Remove Y + trimFactor and set a height of trimFactor *2 which results in
            // trimming trimFactor from top and bottom
            const rotatedGlassesPaddedCropped = rotatedGlassesPadded.getRegion(
              new cv.Rect(0,0 + paddedGlassesHeight * trimFactor,paddedGlassesWidth,paddedGlassesHeightTrimmed));

            //@cv.imwrite("./k_rotatedGlassesPadded.jpg", rotatedGlassesPadded);
            //@cv.imwrite("./k_rotatedGlassesPaddedCropped.jpg",rotatedGlassesPaddedCropped);

            // Before optimising to add padding to prevent rotated imaged being cropped
            // const rectRegionGlasses = new cv.Rect(Math.round(glassesTopLx), Math.round(glassesTopLy), glassesProportionateColumns, glassesProportionateRows);

            // This region allows for padding added by copyMakeBorder in order to
            // prevent rotated image being cropped
            const rectRegionGlassesPadded = new cv.Rect(Math.round(glassesTopLx),Math.round(glassesTopLy),paddedGlassesWidth,paddedGlassesHeight);

            // Optimisation to trim the top and bottom of the area again
            // We defined a trimFactor variable (e.g. .2)
            // Define the region to match the desired end result size
            // The glasses do not rotate beyond 24 degrees so do not need the full padding on the top and bottom
            // Trim off trimFactor from the top and set the height using trimFactor e.g. 1 - twice trimFactor
            const rectRegionGlassesPaddedCropped = new cv.Rect(Math.round(glassesTopLx),
              Math.round(glassesTopLy + paddedGlassesHeight * trimFactor),
              paddedGlassesWidth,paddedGlassesHeightTrimmed);
            // start at y + y - trimFactor then travel height of 1 - trimFactor*2 of the orignal height - should trim trimFactor value from the top and bottom

            if (eyeRotation == 0) {
              isTilted = false;
            } else isTilted = true;
            // Larger area that corresponds to 360 degrees rotation 
            //eyes_and_glasses = regionGlassesBgPadded.add(rotatedGlassesPadded);
            // Trimmed area that allows for rotation of approx +-24 degrees. 
            // Face not detected at more than this. More efficient as not trying to copy an over-large image 
            eyes_and_glasses = regionGlassesBgPaddedCropped.add(rotatedGlassesPaddedCropped);
            //@cv.imwrite("L_eyes_and_glasses.jpg", eyes_and_glasses);

            // // Experimenting to try to get alpha blending working
            // Ref@ https://stackoverflow.com/questions/63432037/how-to-overlay-an-rgba-image-on-top-of-an-rgb-using-opencv
            // const bg = regionGlassesBgPaddedCropped.convertTo(cv.CV_32FC3, 1.0 / 255);
            // const fg = rotatedGlassesPaddedCropped.convertTo(cv.CV_32FC3, 1.0 / 255);
            // const mask = resizedGlassesBGR.convertTo(cv.CV_32FC3, 1.0 / 255);
            // const allOnes = new cv.Mat(glassesMask.rows, glassesMask.cols, cv.CV_32FC3, [1.0, 1.0, 1.0]);
            // const invMask = allOnes.sub(glassesMask);
            // // PROBLEM LINE //const invMask = allOnes.sub(mask);
            // //invMask = allOnes.bitwiseNot();
            // const output = mask.hMul(rotatedGlassesPaddedCropped).add(glassesMask_inv.hMul(regionGlassesBgPaddedCropped));
            //  face_and_mustache = regionMustacheBgPaddedCropped.add(rotatedMustachePadded);

            // useful ternary to select the method
            // mRgba = img.channels === 1 ? img.cvtColor(cv.COLOR_GRAY2RGBA) : img.cvtColor(cv.COLOR_BGR2RGBA);

            // Sequence with the uncropped padded area
            // eyes_and_glasses.copyTo(frame.getRegion(rectRegionGlassesPadded));
            // Cropped rotated area
            
            // Less performant 
            //eyes_and_glasses.copyTo(frame.getRegion(rectRegionGlassesPaddedCropped));
            frame = overlayOnto(
              eyes_and_glasses,
              frame,
              rectRegionGlassesPaddedCropped.x,
              rectRegionGlassesPaddedCropped.y
            );

          } else if (
            (glassesTopLy < 0 && glassesTopLx < 0) ||
            !glassesWithinFrame
          ) {
            console.log("   Cannot position glasses outside of frame");
          }
        } 
        // **************
        // END Glasses
        // **************
      }

      // ************ Moustache ************/
      // Moustache from mouth as nose is unreliable with head tilting .
      if (showMustache == true) {
        if (!mouthDetected && !nose) {
          ("Error: No mouth or nose to place moustache on/near");
        }
        //  if (mouthDetected) { ptMustacheTL = new cv.Point(ptMouthTopMiddle.x +mustacheCols/2, ptMouthTopMiddle.y);}
        if (mouthDetected && !eyeOverlapsMouth) {
          ptMustacheTL = new cv.Point(
            Math.round(ptMouthTopMiddle.x - mustacheCols / 2),
            Math.round(ptMouthTopL.y - mouthRect.height * 1.6)
          ); 
        }
        // Fallback use nose if mouth position not reliable or mouth not detected
        else if (!mouthDetected && nose) {
          ptMustacheTL = new cv.Point(
            ptNoseMiddle.x - mustacheCols / 2,
            noseRect.y - mustacheProportionateRows / 3
          );
        }
        if (mouthDetected || nose) {
          const moustacheTopLx = faceRect.x + ptMustacheTL.x;
          const moustacheTopLy = faceRect.y + ptMustacheTL.y;
          const paddedResizedMustacheBGRchannels = resizedMustacheBGR.copyMakeBorder(
            paddingMustacheT,paddingMustacheB,paddingMustacheL,paddingMustacheR,cv.BORDER_CONSTANT,transColor);
          const paddedMustacheHeight = Math.round(paddedResizedMustacheBGRchannels.rows);
          const paddedMustacheWidth = paddedResizedMustacheBGRchannels.cols;

          const paddedMoustacheHeightTrimmed = Math.round(paddedMustacheHeight * (1 - trimFactor * 2) );

          const moustacheWithinFrame = withinFrame(
            moustacheTopLx,
            moustacheTopLy,
            mustacheCols,
            paddedMoustacheHeightTrimmed,
            frame.cols,
            frame.rows
          );

          if (
            moustacheTopLy > 0 &&
            moustacheTopLx > 0 &&
            moustacheWithinFrame
          ) {
            // ROIS
            // Old ROI; now not valid: const regionMustache = frame.getRegion(new cv.Rect(Math.round(moustacheTopLx), Math.round(moustacheTopLy), mustacheCols, mustacheProportionateRows));
            // 1. ROI For rotated image crop
            const regionMustachePadded = frame.getRegion(
              new cv.Rect(
                Math.round(moustacheTopLx),
                Math.round(moustacheTopLy),
                paddedMustacheWidth,
                paddedMustacheHeight
              )
            );
            const regionMustachePaddedCropped = frame.getRegion(
              new cv.Rect(
                Math.round(moustacheTopLx),
                Math.round(moustacheTopLy + paddedMustacheHeight * trimFactor),
                paddedMustacheWidth,
                paddedMoustacheHeightTrimmed
              )
            );
            // Show cut out section of the frame with visualisations
            //@cv.imwrite("./F_regionMustachePadded.jpg", regionMustachePadded);
            //@cv.imwrite("./F_regionMustachePaddedCropped.jpg",regionMustachePaddedCropped);

            // Create background and foreground ROIs:
            // Old One const regionMustacheBg = regionMustache.bitwiseAnd(regionMustache, mustacheMask_inv);
            ////@cv.imwrite("./G_regionMustacheBg.jpg", regionMustacheBg);

            const regionMustacheBgPadded = regionMustachePadded.bitwiseAnd(
              regionMustachePadded,
              mustacheMask_inv
            );
            //@cv.imwrite("./G_regionMustacheBgPadded.jpg",regionMustacheBgPadded);

            const regionMustacheBgPaddedCropped = regionMustachePaddedCropped.bitwiseAnd(
              regionMustachePaddedCropped,
              mustacheMask_inv
            );
            //@cv.imwrite("./G_regionMustacheBgPaddedCropped.jpg",regionMustacheBgPaddedCropped);

            const regionMustacheBGR_FG = resizedMustacheBGR.bitwiseAnd(
              resizedMustacheBGR,
              resizedMustacheMask
            );
            //@cv.imwrite("./H_regionMustacheBgr_Fg.jpg", regionMustacheBGR_FG);

            const regionMustacheBGR_FGCropped = resizedMustacheBGR.bitwiseAnd(
              resizedMustacheBGR,
              resizedMustacheMask
            );
            //@cv.imwrite("./h_regionMustacheBgr_FgCropped.jpg",regionMustacheBGR_FGCropped);

            // ROTATE
            // const rotMatMustache = cv.getRotationMatrix2D(new cv.Point(mustacheCols / 2, mustacheProportionateRows / 2), eyeRotation);
            const rotMatMustachePaddedTM = cv.getRotationMatrix2D(
              new cv.Point(
                Math.round(paddedMustacheHeight / 2),
                Math.round(paddedMustacheWidth / 2)
              ),
              eyeRotation
            );
            const rotatedMustachePadded = paddedResizedMustacheBGRchannels.warpAffine(
              rotMatMustachePaddedTM
            );

            //@cv.imwrite("./K_rotatedMustachePadded.jpg", rotatedMustachePadded);
            // ***** Crop rotatedGlassesPadded
            // Remove Y + .25 and set a height of ..5 which will end up cropping .25 from top and  bottom
            const rotatedMustachePaddedCropped = rotatedMustachePadded.getRegion(
              new cv.Rect(
                0,0 + paddedMustacheHeight * trimFactor, paddedMustacheWidth,
                paddedMoustacheHeightTrimmed
              )
            );
            //@cv.imwrite("./K_rotatedMustachePaddedCropped.jpg",rotatedMustachePaddedCropped);

            //  const rotMatMustachePaddedTM = cv.getRotationMatrix2D(new cv.Point(Math.round(paddedMustacheHeight / 2), Math.round(paddedMustacheWidth / 2)),  eyeRotation );
            //  const rotatedMustachePadded = paddedResizedMustacheBGRchannels.warpAffine(rotMatMustachePaddedTM);
            //const rotatedMustache = resizedMustacheBGR.warpAffine(rotMatMustache);
            //const rectRegionMustache = new cv.Rect(Math.round(moustacheTopLx), Math.round(moustacheTopLy), mustacheCols, mustacheProportionateRows);
            const rectRegionMustachePadded = new cv.Rect(
              Math.round(moustacheTopLx),
              Math.round(moustacheTopLy),
              paddedMustacheWidth,
              paddedMustacheHeight
            );
            //    const rectRegionMustachePaddedCropped = new cv.Rect(Math.round(moustacheTopLx), Math.round(moustacheTopLy), paddedMustacheWidth, Math.round(paddedMustacheHeight *.6));

            // Crop the region to match the desired end result size
            // Trim off trimFactor from the top and set the height to trimFactor
            const rectRegionMustachePaddedCropped = new cv.Rect(
              Math.round(moustacheTopLx),
              Math.round(moustacheTopLy + paddedMustacheHeight * trimFactor),
              paddedMustacheWidth,
              paddedMoustacheHeightTrimmed
            );

            if (eyeRotation == 0) {
              isTilted = false;
            } else isTilted = true;
            face_and_mustache = regionMustacheBgPaddedCropped.add(rotatedMustachePaddedCropped);
            //@cv.imwrite("L_face_and_mustache.jpg", face_and_mustache);

            //   face_and_mustache.copyTo(frame.getRegion(rectRegionMustachePaddedCropped));
            frame = overlayOnto(
              face_and_mustache,
              frame,
              rectRegionMustachePaddedCropped.x,
              rectRegionMustachePaddedCropped.y
            );
          } else if (
            (moustacheTopLy < 0 && moustacheTopLx < 0) ||
            !moustacheWithinFrame
          ) {
            console.log("   Cannot position moustache outside of frame");
          }
        }

        // **************
        // END Moustache 
        // **************

      }
      cv.imwrite("./l_Frame_moust_glasses.jpg", frame);
    }

    socket.emit("frame", {
      buffer: cv.imencode(".png", frame).toString("base64"),
    });
  }, camInterval);
};