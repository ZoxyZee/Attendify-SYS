import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

import { config } from "./config.js";
import { getDb } from "./db.js";
import { sanitizeUser } from "./utils/serialize.js";

export const signToken = (payload) =>
  jwt.sign(payload, config.jwtSecret, {
    expiresIn: `${config.jwtExpiresInDays}d`
  });

export const getUserFromToken = async (token) => {
  if (!token) {
    const error = new Error("Not authorized.");
    error.status = 401;
    throw error;
  }

  const payload = jwt.verify(token, config.jwtSecret);
  if (!payload.user_id || !payload.company_id) {
    const error = new Error("Invalid session.");
    error.status = 401;
    throw error;
  }

  const db = getDb();
  const user = await db.collection("users").findOne({
    _id: new ObjectId(payload.user_id),
    company_id: payload.company_id
  });
  const company = await db.collection("companies").findOne({
    _id: new ObjectId(payload.company_id)
  });

  if (!user || !company) {
    const error = new Error("Session no longer exists.");
    error.status = 401;
    throw error;
  }

  return {
    ...sanitizeUser(user),
    company_id: payload.company_id,
    role: user.role || payload.role || "admin"
  };
};

export const requireAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    req.user = await getUserFromToken(token);
    next();
  } catch (error) {
    error.status = error.status || 401;
    next(error);
  }
};
