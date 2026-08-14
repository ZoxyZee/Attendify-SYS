import { fromByteArray } from "base64-js";

import {
  assessLiveness,
  cropFaceToInputTensor,
  decodeBase64Image,
  getFaceGuideFeedback,
  getFaceEmbedding,
  loadBlazeFaceModel,
  loadMobileFaceNetModel,
  resizeImageForRecognition,
  selectFace
} from "./embeddingService";
import { createRecognitionClient, normalizeApiError } from "./api";
import { findBestMatch } from "./similarityService";

export { loadMobileFaceNetModel, getFaceEmbedding } from "./embeddingService";
export { cosineSimilarity, findBestMatch } from "./similarityService";

const REMOTE_RECOGNITION_TIMEOUT_MS = 3000;

export const averageEmbeddings = (embeddings) => {
  if (!embeddings?.length) {
    return [];
  }

  const dimensions = embeddings[0]?.length || 0;
  if (!dimensions) {
    return [];
  }

  const totals = new Array(dimensions).fill(0);
  embeddings.forEach((embedding) => {
    for (let i = 0; i < dimensions; i += 1) {
      totals[i] += embedding[i] || 0;
    }
  });

  return totals.map((value) => value / embeddings.length);
};

const useRemoteRecognition = (settings) =>
  Boolean(settings?.recognitionBaseUrl && /^https?:\/\//i.test(settings.recognitionBaseUrl));

const shouldFallbackToLocal = (error) => {
  if (!error) {
    return false;
  }

  const status = error?.response?.status;
  if (status === 401 || status === 403) {
    return false;
  }

  const message = String(typeof error === "string" ? error : error.message || "").toLowerCase();
  const errorCode = String(error?.code || "").toLowerCase();

  return (
    message.includes("network error") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    errorCode === "econnaborted" ||
    message.includes("recognition dependencies are unavailable") ||
    message.includes("recognition model failed to run") ||
    message.includes("insightface is unavailable") ||
    message.includes("no module named") ||
    message.includes("something went wrong while connecting to the backend") ||
    message.includes("no server-recognition employee profiles are available") ||
    message.includes("request failed with status code") ||
    status >= 500
  );
};

const getEmployeeEmbeddings = (employee) => {
  const embeddings = [];
  if (Array.isArray(employee.embeddings) && employee.embeddings.length) {
    embeddings.push(...employee.embeddings.filter((item) => Array.isArray(item) && item.length));
  }
  if (Array.isArray(employee.face_embedding) && employee.face_embedding.length) {
    embeddings.push(employee.face_embedding);
  }
  return embeddings;
};

const normalizeEmployeeCandidates = (employees = []) =>
  employees
    .map((employee) => ({
      employee_id: employee.employee_id,
      name: employee.name,
      embedding_engine: employee.embedding_engine || null,
      embeddings: getEmployeeEmbeddings(employee)
    }))
    .filter((employee) => employee.employee_id && employee.embeddings.length);

const getCompatibleEmployees = (employees = [], engine) => {
  const normalizedEngine = engine || "unknown";
  const exactMatches = employees.filter((employee) => employee.embedding_engine === normalizedEngine);
  if (exactMatches.length) {
    return exactMatches;
  }
  return employees.filter((employee) => !employee.embedding_engine || employee.embedding_engine === "unknown");
};

const serializeEmployeesForRemote = (employees = []) =>
  employees
    .filter((employee) => employee.embedding_engine && employee.embedding_engine !== "local")
    .map((employee) => ({
      employee_id: employee.employee_id,
      name: employee.name,
      embeddings: employee.embeddings
    }))
    .filter((employee) => employee.embeddings.length);

const postRecognition = async (settings, path, payload, timeoutMs = REMOTE_RECOGNITION_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const client = createRecognitionClient(settings, timeoutMs);
    const response = await client.post(path, payload, { signal: controller.signal });
    const data = response.data?.data;
    if (!data) {
      throw new Error(response.data?.message || "Recognition service did not return a valid response.");
    }
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
};

const validateFacePresence = async (base64) => {
  const detector = await loadBlazeFaceModel();
  const imageTensor = decodeBase64Image(base64);

  try {
    const predictions = await detector.estimateFaces(imageTensor, false);
    const faceBox = selectFace(predictions);
    const guideFeedback = getFaceGuideFeedback(faceBox, imageTensor);
    if (guideFeedback) {
      throw new Error(guideFeedback);
    }
  } finally {
    imageTensor.dispose();
  }
};

const recognizeEmployeeRemotely = async ({ base64, employees, settings }) => {
  const candidates = serializeEmployeesForRemote(employees);
  if (!candidates.length) {
    throw new Error("No employee embeddings are available to send to the recognition server.");
  }
  return postRecognition(settings, "/recognize", { image_base64: base64, employees: candidates });
};

const extractEmbeddingRemotely = async ({ base64, settings }) => {
  return postRecognition(settings, "/extract-embedding", { image_base64: base64 });
};

const tensorToRawRgbFrame = async (imageTensor) => {
  if (!imageTensor?.shape || imageTensor.shape.length < 3) {
    throw new Error("Camera frame stream is not ready yet.");
  }

  const [height, width, depth] = imageTensor.shape;
  if (!height || !width || depth < 3) {
    throw new Error("Camera frame was not usable. Tap scan again.");
  }

  const tensorData = await imageTensor.data();
  const rgbBytes = new Uint8Array(width * height * 3);

  for (let pixel = 0, source = 0, target = 0; pixel < width * height; pixel += 1, source += depth, target += 3) {
    rgbBytes[target] = Math.max(0, Math.min(255, Math.round(tensorData[source] || 0)));
    rgbBytes[target + 1] = Math.max(0, Math.min(255, Math.round(tensorData[source + 1] || 0)));
    rgbBytes[target + 2] = Math.max(0, Math.min(255, Math.round(tensorData[source + 2] || 0)));
  }

  return {
    image_rgb_base64: fromByteArray(rgbBytes),
    width,
    height
  };
};

export const extractFaceEmbedding = async ({ base64, settings }) => {
  if (!base64) {
    throw new Error("No camera frame available.");
  }

  if (useRemoteRecognition(settings)) {
    try {
      return await extractEmbeddingRemotely({ base64, settings });
    } catch (error) {
      if (!shouldFallbackToLocal(error)) {
        throw new Error(normalizeApiError(error));
      }
    }
  }

  const [detector] = await Promise.all([loadBlazeFaceModel(), loadMobileFaceNetModel()]);
  const decodedTensor = decodeBase64Image(base64);
  const imageTensor = resizeImageForRecognition(decodedTensor);

  try {
    const predictions = await detector.estimateFaces(imageTensor, false);
    const faceBox = selectFace(predictions);
    const guideFeedback = getFaceGuideFeedback(faceBox, imageTensor);
    if (guideFeedback) {
      throw new Error(guideFeedback);
    }

    const faceTensor = cropFaceToInputTensor(imageTensor, faceBox);
    const embedding = await getFaceEmbedding(faceTensor);
    faceTensor.dispose();

    return {
      embedding,
      faceBox,
      liveness: {
        passed: true,
        metrics: {}
      },
      engine: "local"
    };
  } finally {
    if (imageTensor !== decodedTensor) {
      imageTensor.dispose();
    }
    decodedTensor.dispose();
  }
};

export const recognizeEmployee = async ({ base64, employees, settings }) => {
  const normalizedEmployees = normalizeEmployeeCandidates(employees);
  if (!normalizedEmployees.length) {
    throw new Error("No employee embeddings are available on this kiosk. Enroll at least one employee before scanning.");
  }

  let candidates = normalizedEmployees;
  const remoteCandidates = serializeEmployeesForRemote(candidates);
  if (useRemoteRecognition(settings) && remoteCandidates.length) {
    try {
      console.log("Trying remote recognition...");
      const remoteResult = await Promise.race([
        recognizeEmployeeRemotely({ base64, employees: remoteCandidates, settings }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Remote timeout")), 3000))
      ]);
      console.log("Remote success");
      return remoteResult;
    } catch (error) {
      console.warn("Remote failed:", error.message);
      if (!shouldFallbackToLocal(error)) {
        throw new Error(normalizeApiError(error));
      }
    }
  }

  if (useRemoteRecognition(settings) && remoteCandidates.length) {
    candidates = getCompatibleEmployees(normalizedEmployees, "local");
  }

  if (!candidates.length) {
    candidates = normalizedEmployees;
  }

  if (!candidates.length) {
    throw new Error(
      "No compatible local employee embeddings are available on this kiosk. Re-import or re-enroll employees after updating recognition settings."
    );
  }

  const { embedding, faceBox, liveness } = await extractFaceEmbedding({ base64, settings });
  const match = findBestMatch(embedding, candidates);

  if (!liveness.passed && match.confidence < 0.9) {
    throw new Error("Face not clear enough yet. Move a little closer and look straight at the camera.");
  }

  return {
    employee_id: match.employee_id,
    employee_name: match.employee_name,
    confidence: match.confidence,
    similarity: match.similarity,
    embedding_engine: "local",
    embedding,
    faceBox,
    liveness
  };
};

export const extractFaceEmbeddingFromFrame = async ({ imageTensor, settings }) => {
  if (!imageTensor) {
    throw new Error("No camera frame available.");
  }

  if (!useRemoteRecognition(settings)) {
    throw new Error("Set the kiosk Recognition API URL in admin settings before registering faces.");
  }

  const payload = await tensorToRawRgbFrame(imageTensor);
  return postRecognition(settings, "/extract-embedding-frame", payload);
};

export const recognizeEmployeeFromFrame = async ({ imageTensor, employees, settings }) => {
  const normalizedEmployees = normalizeEmployeeCandidates(employees);
  if (!normalizedEmployees.length) {
    throw new Error("No employee embeddings are available on this kiosk. Enroll at least one employee before scanning.");
  }

  if (!useRemoteRecognition(settings)) {
    throw new Error("Set the kiosk Recognition API URL in admin settings before scanning.");
  }

  const payload = await tensorToRawRgbFrame(imageTensor);
  return postRecognition(settings, "/recognize-frame", {
    ...payload,
    employees: serializeEmployeesForRemote(normalizedEmployees)
  });
};
