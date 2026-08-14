import { Router } from "express";

import { requireAuth } from "../auth.js";
import { getDb } from "../db.js";
import { serialize } from "../utils/serialize.js";
import { nowUtc, toDate } from "../utils/time.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const employeesRouter = Router();
employeesRouter.use(requireAuth);

const buildEmployee = (companyId, payload) => ({
  company_id: companyId,
  employee_id: payload.employee_id,
  name: payload.name,
  department: payload.department || "General",
  face_label: payload.face_label || payload.employee_id,
  face_embedding: payload.face_embedding || [],
  face_embeddings: (payload.face_embeddings || []).slice(0, 5),
  face_image_base64: payload.face_image_base64 || "",
  face_match_vector: payload.face_match_vector || [],
  embedding_engine: payload.embedding_engine || null,
  face_registered_at: payload.face_registered_at
    ? toDate(payload.face_registered_at)
    : ((payload.face_label || payload.face_embeddings?.length || payload.face_image_base64 || payload.face_match_vector?.length) ? nowUtc() : null),
  status: payload.status || "active",
  createdAt: nowUtc(),
  updatedAt: nowUtc()
});

employeesRouter.post("/create", asyncHandler(async (req, res) => {
  const employee = buildEmployee(req.user.company_id, req.body);
  try {
    const result = await getDb().collection("employees").insertOne(employee);
    employee._id = result.insertedId;
  } catch (error) {
    if (error.code === 11000) {
      error.status = 409;
      error.message = "Employee ID already exists for this company.";
    }
    throw error;
  }
  res.json({ success: true, message: "Employee created successfully.", data: serialize(employee) });
}));

employeesRouter.get("/list", asyncHandler(async (req, res) => {
  const employees = await getDb().collection("employees")
    .find({ company_id: req.user.company_id })
    .sort({ name: 1 })
    .toArray();
  res.json({ success: true, data: serialize(employees) });
}));

employeesRouter.put("/update", asyncHandler(async (req, res) => {
  const { employee_id, ...updates } = req.body;
  if (!employee_id) {
    const error = new Error("employee_id is required.");
    error.status = 422;
    throw error;
  }
  if (updates.face_embeddings) {
    updates.face_embeddings = updates.face_embeddings.slice(0, 5);
  }
  if (updates.face_registered_at) {
    updates.face_registered_at = toDate(updates.face_registered_at);
  }
  updates.updatedAt = nowUtc();

  const result = await getDb().collection("employees").findOneAndUpdate(
    { company_id: req.user.company_id, employee_id },
    { $set: updates },
    { returnDocument: "after" }
  );
  if (!result) {
    const error = new Error("Employee not found.");
    error.status = 404;
    throw error;
  }
  res.json({ success: true, message: "Employee updated successfully.", data: serialize(result) });
}));

employeesRouter.delete("/delete", asyncHandler(async (req, res) => {
  const employeeId = req.body?.employee_id || req.query.employee_id;
  const result = await getDb().collection("employees").deleteOne({ company_id: req.user.company_id, employee_id: employeeId });
  res.json({ success: true, message: result.deletedCount ? "Employee deleted successfully." : "Employee not found." });
}));
