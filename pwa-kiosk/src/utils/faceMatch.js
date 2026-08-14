const VECTOR_SIZE = 48;
const PROFILE_CACHE = new Map();

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Face image could not be loaded."));
    image.src = src.startsWith("data:") ? src : `data:image/jpeg;base64,${src}`;
  });

export const createVisualFaceVector = async (imageBase64) => {
  const clean = String(imageBase64 || "").replace(/^data:image\/[a-zA-Z]+;base64,/, "");
  if (!clean) {
    return null;
  }

  const cached = PROFILE_CACHE.get(clean);
  if (cached) {
    return cached;
  }

  const image = await loadImage(clean);
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const vector = new Array(VECTOR_SIZE).fill(0);

  for (let index = 0; index < data.length; index += 4) {
    const pixel = index / 4;
    const bucket = pixel % VECTOR_SIZE;
    const red = data[index] / 255;
    const green = data[index + 1] / 255;
    const blue = data[index + 2] / 255;
    const luminance = (red * 0.299) + (green * 0.587) + (blue * 0.114);
    vector[bucket] += (luminance + Math.abs(red - green) + Math.abs(green - blue)) / 3;
  }

  const normalized = vector.map((value) => value / Math.ceil((canvas.width * canvas.height) / VECTOR_SIZE));
  PROFILE_CACHE.set(clean, normalized);
  return normalized;
};

const distance = (left, right) => {
  let total = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    total += Math.abs((left[index] || 0) - (right[index] || 0));
  }
  return total / length;
};

export const recognizeFromFrame = async ({ frame, employees }) => {
  const scanVector = await createVisualFaceVector(frame);
  if (!scanVector) {
    throw new Error("No camera frame captured.");
  }

  const candidates = [];
  for (const employee of employees) {
    if (!employee.face_image_base64) {
      continue;
    }
    const profileVector = await createVisualFaceVector(employee.face_image_base64);
    if (!profileVector) {
      continue;
    }
    candidates.push({
      employee,
      distance: distance(scanVector, profileVector)
    });
  }

  if (!candidates.length) {
    throw new Error("No registered face photos found. Register employee faces first.");
  }

  candidates.sort((left, right) => left.distance - right.distance);
  const best = candidates[0];
  const second = candidates[1];
  const gap = second ? second.distance - best.distance : 0.08;
  const confidence = Math.max(0, Math.min(1, 1 - best.distance * 5));

  if (best.distance > 0.18 || confidence < 0.55) {
    throw new Error("Face not matched. Improve light and keep face centered.");
  }

  if (second && gap < 0.018) {
    throw new Error("Face match is too close to another employee. Try better lighting.");
  }

  return {
    employee_id: best.employee.employee_id,
    employee_name: best.employee.name || best.employee.employee_id,
    confidence,
    distance: best.distance
  };
};
