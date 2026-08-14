const VECTOR_SIZE = 64;

export const createFacePhotoVector = (base64 = "") => {
  const clean = String(base64).replace(/^data:image\/[a-zA-Z]+;base64,/, "");
  const vector = new Array(VECTOR_SIZE).fill(0);

  if (!clean) {
    return vector;
  }

  const step = Math.max(1, Math.floor(clean.length / 8192));
  let samples = 0;

  for (let index = 0; index < clean.length; index += step) {
    const code = clean.charCodeAt(index);
    const bucket = samples % VECTOR_SIZE;
    vector[bucket] = (vector[bucket] * 0.75) + ((code % 256) / 255) * 0.25;
    samples += 1;
  }

  return vector;
};

export const facePhotoDistance = (left = [], right = []) => {
  if (!left.length || !right.length) {
    return Number.POSITIVE_INFINITY;
  }

  let total = 0;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    total += Math.abs((left[index] || 0) - (right[index] || 0));
  }
  return total / Math.min(left.length, right.length);
};
