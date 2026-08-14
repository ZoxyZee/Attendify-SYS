import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { Router } from "express";

import { requireAuth, signToken } from "../auth.js";
import { getDb } from "../db.js";
import { sanitizeUser, serialize } from "../utils/serialize.js";
import { nowUtc } from "../utils/time.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post("/register-company", asyncHandler(async (req, res) => {
  const { company_name, admin_email, subscription_plan = "basic", name, password } = req.body;
  if (!company_name || !admin_email || !name || !password || password.length < 6) {
    const error = new Error("Company name, admin email, name and 6+ character password are required.");
    error.status = 422;
    throw error;
  }

  const db = getDb();
  const email = String(admin_email).toLowerCase();
  if (await db.collection("companies").findOne({ admin_email: email })) {
    const error = new Error("A company with this admin email already exists.");
    error.status = 409;
    throw error;
  }

  const company = {
    company_name,
    admin_email: email,
    subscription_plan,
    work_schedule: { start_time: "09:00", end_time: "18:00", timezone: "Asia/Calcutta" },
    created_at: nowUtc()
  };
  const companyResult = await db.collection("companies").insertOne(company);
  company._id = companyResult.insertedId;

  const user = {
    company_id: company._id.toString(),
    name,
    email,
    password_hash: await bcrypt.hash(password, 10),
    role: "admin",
    createdAt: nowUtc(),
    updatedAt: nowUtc()
  };
  const userResult = await db.collection("users").insertOne(user);
  user._id = userResult.insertedId;

  const token = signToken({ user_id: user._id.toString(), company_id: company._id.toString(), role: user.role });
  res.json({
    success: true,
    message: "Company registered successfully.",
    data: {
      token,
      company_id: company._id.toString(),
      company: serialize(company),
      user: sanitizeUser(user)
    }
  });
}));

authRouter.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await getDb().collection("users").findOne({ email: String(email || "").toLowerCase() });
  if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
    const error = new Error("Invalid email or password.");
    error.status = 401;
    throw error;
  }

  const token = signToken({ user_id: user._id.toString(), company_id: user.company_id, role: user.role });
  res.json({
    success: true,
    message: "Login successful.",
    data: { token, company_id: user.company_id, user: sanitizeUser(user) }
  });
}));

authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { company_id: req.user.company_id, user: req.user } });
}));
