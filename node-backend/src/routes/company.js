import { ObjectId } from "mongodb";
import { Router } from "express";

import { requireAuth } from "../auth.js";
import { getDb } from "../db.js";
import { serialize } from "../utils/serialize.js";
import { nowUtc } from "../utils/time.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const companyRouter = Router();
companyRouter.use(requireAuth);

companyRouter.get("/settings", asyncHandler(async (req, res) => {
  const company = await getDb().collection("companies").findOne({ _id: new ObjectId(req.user.company_id) });
  res.json({ success: true, data: serialize(company || {}) });
}));

companyRouter.put("/settings", asyncHandler(async (req, res) => {
  const allowed = ["company_name", "subscription_plan", "work_schedule", "kiosk_admin_pin"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }
  updates.updatedAt = nowUtc();
  const company = await getDb().collection("companies").findOneAndUpdate(
    { _id: new ObjectId(req.user.company_id) },
    { $set: updates },
    { returnDocument: "after" }
  );
  res.json({ success: true, message: "Company settings updated successfully.", data: serialize(company) });
}));
