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

export const averageFacePhotoVectors = (vectors = []) => {
  const usable = vectors.filter((item) => Array.isArray(item) && item.length);
  if (!usable.length) {
    return [];
  }

  const totals = new Array(VECTOR_SIZE).fill(0);
  usable.forEach((vector) => {
    for (let index = 0; index < VECTOR_SIZE; index += 1) {
      totals[index] += vector[index] || 0;
    }
  });

  return totals.map((value) => value / usable.length);
};

const vectorDistance = (left = [], right = []) => {
  if (!left.length || !right.length) {
    return Number.POSITIVE_INFINITY;
  }

  let total = 0;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    total += Math.abs((left[index] || 0) - (right[index] || 0));
  }
  return total / Math.min(left.length, right.length);
};

export const findBestFacePhotoMatch = (base64, employees = []) => {
  const scanVector = createFacePhotoVector(base64);
  const candidates = employees
    .filter((employee) => Array.isArray(employee.face_match_vector) && employee.face_match_vector.length)
    .map((employee) => ({
      employee,
      distance: vectorDistance(scanVector, employee.face_match_vector)
    }))
    .sort((left, right) => left.distance - right.distance);

  if (!candidates.length) {
    return null;
  }

  const best = candidates[0];
  return {
    employee: best.employee,
    confidence: Number(Math.max(0.55, 1 - best.distance * 3).toFixed(3))
  };
};
