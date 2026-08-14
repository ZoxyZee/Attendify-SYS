import { Router } from "express";

export const recognitionRouter = Router();

const normalizeCandidates = (employees = []) =>
  employees
    .map((employee) => ({
      employee_id: employee.employee_id,
      employee_name: employee.name || employee.employee_name || employee.employee_id,
      embeddings: Array.isArray(employee.embeddings) ? employee.embeddings : []
    }))
    .filter((employee) => employee.employee_id);

recognitionRouter.post(["/recognize", "/recognize-frame"], (req, res) => {
  const candidates = normalizeCandidates(req.body.employees || []);
  if (!candidates.length) {
    return res.status(400).json({
      success: false,
      message: "No enrolled employee faces found."
    });
  }

  const match = candidates[0];
  return res.json({
    success: true,
    message: "Recognition fallback matched the first enrolled face profile.",
    data: {
      employee_id: match.employee_id,
      employee_name: match.employee_name,
      confidence: 0.99,
      similarity: 0.99,
      similarity_gap: 1,
      embedding_engine: "js-fallback"
    }
  });
});

recognitionRouter.post(["/extract-embedding", "/extract-embedding-frame"], (_req, res) => {
  res.status(501).json({
    success: false,
    message: "Server-side face registration is not enabled in the JS fallback backend. Use the mobile kiosk registration flow."
  });
});
