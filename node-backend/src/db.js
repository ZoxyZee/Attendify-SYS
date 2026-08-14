import { MongoClient } from "mongodb";

import { config } from "./config.js";

const client = new MongoClient(config.mongodbUri);
let database = null;

export const connectDatabase = async () => {
  if (!database) {
    await client.connect();
    database = client.db();
    await ensureIndexes();
  }
  return database;
};

export const getDb = () => {
  if (!database) {
    throw new Error("Database has not been initialized.");
  }
  return database;
};

export const ensureIndexes = async () => {
  const db = database || client.db();
  await Promise.all([
    db.collection("companies").createIndex({ admin_email: 1 }, { unique: true }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("employees").createIndex({ company_id: 1, employee_id: 1 }, { unique: true }),
    db.collection("devices").createIndex({ company_id: 1, device_id: 1 }, { unique: true }),
    db.collection("attendance").createIndex({ company_id: 1, employee_id: 1, type: 1, timestamp: 1 }, { unique: true }),
    db.collection("attendance").createIndex({ company_id: 1, employee_id: 1, timestamp: 1 })
  ]);
};

export const checkDatabase = async () => {
  await getDb().command({ ping: 1 });
  return { ok: true, message: "MongoDB connection is healthy." };
};
