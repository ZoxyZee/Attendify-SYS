import { Router } from "express";

import { requireAuth } from "../auth.js";
import { getDb } from "../db.js";
import { serialize } from "../utils/serialize.js";
import { nowUtc } from "../utils/time.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const devicesRouter = Router();
devicesRouter.use(requireAuth);

devicesRouter.post("/register", asyncHandler(async (req, res) => {
  const { device_id, device_name } = req.body;
  const device = {
    company_id: req.user.company_id,
    device_id,
    device_name,
    last_active: nowUtc(),
    status: "active",
    updatedAt: nowUtc()
  };
  await getDb().collection("devices").updateOne(
    { company_id: req.user.company_id, device_id },
    { $set: { ...device, updatedAt: nowUtc() }, $setOnInsert: { createdAt: nowUtc() } },
    { upsert: true }
  );
  const saved = await getDb().collection("devices").findOne({ company_id: req.user.company_id, device_id });
  res.json({ success: true, message: "Device registered successfully.", data: serialize(saved) });
}));

devicesRouter.get("/list", asyncHandler(async (req, res) => {
  const devices = await getDb().collection("devices").find({ company_id: req.user.company_id }).sort({ last_active: -1 }).toArray();
  res.json({ success: true, data: serialize(devices) });
}));

devicesRouter.delete("/:deviceId", asyncHandler(async (req, res) => {
  const deviceId = String(req.params.deviceId || "").trim();
  if (!deviceId) {
    const error = new Error("Device ID is required.");
    error.status = 400;
    throw error;
  }

  const result = await getDb().collection("devices").deleteOne({
    company_id: req.user.company_id,
    device_id: deviceId
  });

  if (!result.deletedCount) {
    const error = new Error("Device was not found for this company.");
    error.status = 404;
    throw error;
  }

  res.json({ success: true, message: "Device removed successfully." });
}));
