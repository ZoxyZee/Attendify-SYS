import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "/models/face-api";
const MATCH_THRESHOLD = 0.5;
const CLOSE_GAP_THRESHOLD = 0.06;
const descriptorCache = new Map();
let modelPromise = null;

const toDataUrl = (value = "") => {
  const clean = String(value || "");
  return clean.startsWith("data:") ? clean : `data:image/jpeg;base64,${clean}`;
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Face image could not be loaded."));
    image.src = toDataUrl(src);
  });

export const loadFaceModels = () => {
  if (!modelPromise) {
    modelPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
  }
  return modelPromise;
};

const getDescriptor = async (imageSource, cacheKey = "") => {
  const key = cacheKey || imageSource;
  if (descriptorCache.has(key)) {
    return descriptorCache.get(key);
  }

  await loadFaceModels();
  const image = typeof imageSource === "string" ? await loadImage(imageSource) : imageSource;
  const detection = await faceapi
    .detectSingleFace(
      image,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.35
      })
    )
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  if (!detection?.descriptor) {
    throw new Error("No clear face detected. Keep one face centered with better light.");
  }

  const descriptor = Array.from(detection.descriptor);
  descriptorCache.set(key, descriptor);
  return descriptor;
};

const descriptorDistance = (left, right) => {
  let total = 0;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const diff = left[index] - right[index];
    total += diff * diff;
  }
  return Math.sqrt(total);
};

export const recognizeFromFrame = async ({ frame, employees }) => {
  const scanDescriptor = await getDescriptor(frame, `scan-${Date.now()}`);
  const candidates = [];

  for (const employee of employees) {
    if (!employee.face_image_base64) {
      continue;
    }

    try {
      const descriptor = await getDescriptor(employee.face_image_base64, `employee-${employee.employee_id}-${employee.face_registered_at || ""}`);
      candidates.push({
        employee,
        distance: descriptorDistance(scanDescriptor, descriptor)
      });
    } catch {
      // Skip invalid employee face profiles without breaking the scanner.
    }
  }

  if (!candidates.length) {
    throw new Error("No usable registered faces found. Re-register employee faces first.");
  }

  candidates.sort((left, right) => left.distance - right.distance);
  const best = candidates[0];
  const second = candidates[1];
  const gap = second ? second.distance - best.distance : 1;

  if (best.distance > MATCH_THRESHOLD) {
    throw new Error("Face not recognized. Register this face or improve lighting.");
  }

  if (second && gap < CLOSE_GAP_THRESHOLD) {
    throw new Error("Face match is too close to another employee. Re-scan in better light.");
  }

  return {
    employee_id: best.employee.employee_id,
    employee_name: best.employee.name || best.employee.employee_id,
    confidence: Number(Math.max(0, 1 - best.distance).toFixed(3)),
    distance: best.distance
  };
};
