import api from "./api";

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
      embeddings: getEmployeeEmbeddings(employee)
    }))
    .filter((employee) => employee.embeddings.length);

  if (!candidates.length) {
    throw new Error("No enrolled employee faces found. Capture employee images in Face Registry first.");
  }

  const response = await api.post("/recognition/recognize", {
    image_base64: stripDataUrlPrefix(imageBase64),
    employees: candidates
  });
  return response.data.data;
};
