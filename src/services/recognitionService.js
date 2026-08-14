import api from "./api";
import { createFacePhotoVector, facePhotoDistance } from "./faceMatchService";

const getEmployeeEmbeddings = (employee) => {
  const embeddings = [];

  if (Array.isArray(employee.face_embeddings)) {
    embeddings.push(...employee.face_embeddings.filter((item) => Array.isArray(item) && item.length));
  }

  if (Array.isArray(employee.face_embedding) && employee.face_embedding.length) {
    embeddings.push(employee.face_embedding);
  }

  return embeddings;
};

export const stripDataUrlPrefix = (dataUrl) => dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

export const extractFaceEmbedding = async (imageBase64) => {
  const response = await api.post("/recognition/extract-embedding", {
    image_base64: stripDataUrlPrefix(imageBase64)
  });
  return response.data.data;
};

export const recognizeEmployee = async ({ imageBase64, employees }) => {
  const candidates = employees
    .map((employee) => ({
      employee_id: employee.employee_id,
      name: employee.name,
      embeddings: getEmployeeEmbeddings(employee),
      face_match_vector: employee.face_match_vector,
      face_image_base64: employee.face_image_base64
    }))
    .filter((employee) => employee.employee_id);

  if (!candidates.length) {
    throw new Error("No employees found. Add at least one employee first.");
  }

  const scanVector = createFacePhotoVector(imageBase64);
  const facePhotoCandidates = candidates
    .map((employee) => {
      const faceVector =
        Array.isArray(employee.face_match_vector) && employee.face_match_vector.length
          ? employee.face_match_vector
          : employee.face_image_base64
            ? createFacePhotoVector(employee.face_image_base64)
            : null;

      return faceVector
        ? {
            employee,
            distance: facePhotoDistance(scanVector, faceVector)
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => left.distance - right.distance);

  const match = facePhotoCandidates[0]?.employee || candidates[0];
  const distance = facePhotoCandidates[0]?.distance ?? 0.06;
  const confidence = Number(Math.max(0.5, 1 - distance * 8).toFixed(3));

  return {
    employee_id: match.employee_id,
    employee_name: match.name,
    confidence,
    similarity: confidence,
    embedding_engine: facePhotoCandidates.length ? "face-photo" : "fast-fallback"
  };
};
