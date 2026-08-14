import * as blazeface from "@tensorflow-models/blazeface";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import * as tfReactNative from "@tensorflow/tfjs-react-native";
import { toByteArray } from "base64-js";

import mobileFaceNetModelJson from "../../assets/models/mobilefacenet/model.json";

const mobileFaceNetWeights = [
  require("../../assets/models/mobilefacenet/group1-shard1of1.bin")
];

let setupPromise = null;
let detectorPromise = null;
let mobileFaceNetPromise = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeVector = (vector) => {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
};

export const ensureTensorFlowReady = async () => {
  if (!setupPromise) {
    setupPromise = (async () => {
      await tf.ready();

      if (tf.getBackend() !== "rn-webgl") {
        const backendReady = await tf.setBackend("rn-webgl");
        if (!backendReady) {
          throw new Error("TensorFlow rn-webgl backend could not be selected.");
        }
      }

      await tf.ready();

      const warmup = tf.tensor1d([0]);
      await warmup.data();
      warmup.dispose();
    })();
  }

  try {
    await setupPromise;
  } catch (error) {
    setupPromise = null;
    throw error;
  }
};

export const loadBlazeFaceModel = async () => {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await ensureTensorFlowReady();
      return blazeface.load();
    })();
  }

  return detectorPromise;
};

export const loadMobileFaceNetModel = async () => {
  if (!mobileFaceNetPromise) {
    mobileFaceNetPromise = (async () => {
      await ensureTensorFlowReady();
      return tf.loadGraphModel(tfReactNative.bundleResourceIO(mobileFaceNetModelJson, mobileFaceNetWeights));
    })();
  }

  return mobileFaceNetPromise;
};

export const decodeBase64Image = (base64) => tfReactNative.decodeJpeg(toByteArray(base64));

export const resizeImageForRecognition = (imageTensor, maxSide = 640) => {
  const [height, width] = imageTensor.shape;
  const largestSide = Math.max(height, width);

  if (!largestSide || largestSide <= maxSide) {
    return imageTensor;
  }

  const scale = maxSide / largestSide;
  const nextHeight = Math.max(1, Math.round(height * scale));
  const nextWidth = Math.max(1, Math.round(width * scale));
  return tf.image.resizeBilinear(imageTensor, [nextHeight, nextWidth], true).toInt();
};

export const selectFace = (predictions) => {
  if (!predictions?.length) {
    throw new Error("No face detected. Please center your face in the guide.");
  }

  if (predictions.length > 1) {
    throw new Error("Multiple faces detected. Please scan one person at a time.");
  }

  const prediction = predictions[0];
  const [x1, y1] = prediction.topLeft;
  const [x2, y2] = prediction.bottomRight;
  const landmarks = prediction.landmarks || [];

  return {
    topLeft: [x1, y1],
    bottomRight: [x2, y2],
    landmarks
  };
};

const getFaceCenter = (faceBox) => {
  if (Array.isArray(faceBox.landmarks) && faceBox.landmarks.length) {
    const sum = faceBox.landmarks.reduce(
      (acc, landmark) => [acc[0] + (landmark[0] || 0), acc[1] + (landmark[1] || 0)],
      [0, 0]
    );
    return [sum[0] / faceBox.landmarks.length, sum[1] / faceBox.landmarks.length];
  }

  const boxWidth = Math.max(1, faceBox.bottomRight[0] - faceBox.topLeft[0]);
  const boxHeight = Math.max(1, faceBox.bottomRight[1] - faceBox.topLeft[1]);
  return [faceBox.topLeft[0] + boxWidth / 2, faceBox.topLeft[1] + boxHeight / 2];
};

export const getFaceGuideFeedback = (faceBox, imageTensor) => {
  const [imageHeight, imageWidth] = imageTensor.shape;
  const boxWidth = Math.max(1, faceBox.bottomRight[0] - faceBox.topLeft[0]);
  const boxHeight = Math.max(1, faceBox.bottomRight[1] - faceBox.topLeft[1]);
  const faceCoverage = (boxWidth * boxHeight) / (imageHeight * imageWidth);
  const [centerX, centerY] = getFaceCenter(faceBox);
  const horizontalOffset = Math.abs(centerX / imageWidth - 0.5);
  const verticalOffset = Math.abs(centerY / imageHeight - 0.5);

  if (faceCoverage < 0.06) {
    return "Move closer so your face fills the oval guide.";
  }

  if (faceCoverage > 0.75) {
    return "Move a little farther back so your full face fits inside the guide.";
  }

  if (horizontalOffset > 0.32 || verticalOffset > 0.35) {
    return "Center your face inside the oval guide.";
  }

  return null;
};

const calculateAlignment = (faceBox) => {
  if (!faceBox.landmarks?.length || faceBox.landmarks.length < 2) {
    return {
      radians: 0,
      aligned: false
    };
  }

  const [leftEye, rightEye] = faceBox.landmarks;
  const radians = Math.atan2(rightEye[1] - leftEye[1], rightEye[0] - leftEye[0]);
  return {
    radians,
    aligned: Math.abs(radians) <= 0.35
  };
};

export const assessLiveness = async (faceTensor, faceBox, imageTensor) => {
  const [imageHeight, imageWidth] = imageTensor.shape;
  const boxWidth = Math.max(1, faceBox.bottomRight[0] - faceBox.topLeft[0]);
  const boxHeight = Math.max(1, faceBox.bottomRight[1] - faceBox.topLeft[1]);
  const faceCoverage = (boxWidth * boxHeight) / (imageHeight * imageWidth);

  const metrics = tf.tidy(() => {
    const normalized = faceTensor.squeeze().add(1).div(2);
    const grayscale = normalized.mean(2);
    const brightness = grayscale.mean();
    const brightnessVariance = tf.moments(grayscale).variance;
    const verticalDiff = grayscale.slice([1, 0], [grayscale.shape[0] - 1, grayscale.shape[1]])
      .sub(grayscale.slice([0, 0], [grayscale.shape[0] - 1, grayscale.shape[1]]))
      .abs()
      .mean();
    const horizontalDiff = grayscale.slice([0, 1], [grayscale.shape[0], grayscale.shape[1] - 1])
      .sub(grayscale.slice([0, 0], [grayscale.shape[0], grayscale.shape[1] - 1]))
      .abs()
      .mean();
    const sharpness = verticalDiff.add(horizontalDiff).div(2);

    return {
      brightness: brightness.dataSync()[0],
      brightnessVariance: brightnessVariance.dataSync()[0],
      sharpness: sharpness.dataSync()[0]
    };
  });

  const checks = [
    faceCoverage >= 0.03,
    metrics.brightness >= 0.1 && metrics.brightness <= 0.97,
    metrics.brightnessVariance >= 0.0007,
    metrics.sharpness >= 0.007
  ];

  return {
    passed: checks.every(Boolean),
    metrics: {
      ...metrics,
      faceCoverage
    }
  };
};

export const cropFaceToInputTensor = (imageTensor, faceBox) =>
  tf.tidy(() => {
    const [x1, y1] = faceBox.topLeft;
    const [x2, y2] = faceBox.bottomRight;
    const [imageHeight, imageWidth] = imageTensor.shape;
    const paddingX = (x2 - x1) * 0.18;
    const paddingY = (y2 - y1) * 0.22;
    const left = Math.max(0, Math.floor(x1 - paddingX));
    const top = Math.max(0, Math.floor(y1 - paddingY));
    const right = Math.min(imageWidth, Math.ceil(x2 + paddingX));
    const bottom = Math.min(imageHeight, Math.ceil(y2 + paddingY));
    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);
    const cropped = imageTensor.slice([top, left, 0], [height, width, 3]).toFloat();
    const alignment = calculateAlignment(faceBox);
    const relativeLeftEye = faceBox.landmarks?.[0]
      ? [
          clamp((faceBox.landmarks[0][0] - left) / width, 0, 1),
          clamp((faceBox.landmarks[0][1] - top) / height, 0, 1)
        ]
      : null;
    const relativeRightEye = faceBox.landmarks?.[1]
      ? [
          clamp((faceBox.landmarks[1][0] - left) / width, 0, 1),
          clamp((faceBox.landmarks[1][1] - top) / height, 0, 1)
        ]
      : null;

    let alignedCrop = cropped;
    if (alignment.aligned && Math.abs(alignment.radians) > 0.03 && typeof tf.image.rotateWithOffset === "function") {
      alignedCrop = tf.image.rotateWithOffset(cropped.expandDims(0), -alignment.radians, 0, 0.5, 0.5).squeeze(0);
    }

    const resized = tf.image.resizeBilinear(alignedCrop, [112, 112], true);
    const normalized = resized.div(127.5).sub(1).expandDims(0);
    normalized.alignmentMetadata = {
      radians: alignment.radians,
      leftEye: relativeLeftEye,
      rightEye: relativeRightEye
    };
    return normalized;
  });

export const getFaceEmbedding = async (faceTensor) => {
  const model = await loadMobileFaceNetModel();
  const result = tf.tidy(() => {
    const prediction = model.predict(faceTensor);
    const tensor = Array.isArray(prediction) ? prediction[0] : prediction;
    return tensor.squeeze();
  });

  const values = await result.data();
  result.dispose();
  return normalizeVector(Array.from(values));
};
