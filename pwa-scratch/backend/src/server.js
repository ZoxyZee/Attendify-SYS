import cors from "cors";
import express from "express";
import { MongoClient } from "mongodb";

const PORT = Number(process.env.PORT || 5055);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGO_DB || "attendify_pwa_scratch";
const IST_TIMEZONE = "Asia/Kolkata";

const app = express();
const mongo = new MongoClient(MONGO_URI);
const clients = new Set();
let db;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "8mb" }));

const now = () => new Date();
const serialize = (value) => JSON.parse(JSON.stringify(value));

const istKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);

const istDayRange = (date = new Date()) => {
  const key = istKey(date);
  const start = new Date(`${key}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 86400000 - 1);
  return { start, end };
};

const publish = (event, payload) => {
  const data = JSON.stringify({ ...payload, at: now().toISOString() });
  for (const res of clients) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${data}\n\n`);
  }
};

const employeesCollection = () => db.collection("employees");
const attendanceCollection = () => db.collection("attendance");

const getEmployees = () =>
  employeesCollection().find({ active: { $ne: false } }).sort({ name: 1 }).toArray();

const getTodayAttendance = () => {
  const { start, end } = istDayRange();
  return attendanceCollection().find({ timestamp: { $gte: start, $lte: end } }).sort({ timestamp: -1 }).toArray();
};

const resolveType = async (employeeId) => {
  const { start, end } = istDayRange();
  const latest = await attendanceCollection().findOne(
    { employee_id: employeeId, timestamp: { $gte: start, $lte: end } },
    { sort: { timestamp: -1 } }
  );
  return latest?.type === "check_in" ? "check_out" : "check_in";
};

const summary = async () => {
  const [employees, rows] = await Promise.all([getEmployees(), getTodayAttendance()]);
  const present = new Set();
  for (const row of rows.slice().reverse()) {
    if (row.type === "check_in") {
      present.add(row.employee_id);
    } else {
      present.delete(row.employee_id);
    }
  }
  return {
    totalEmployees: employees.length,
    presentToday: present.size,
    recordsToday: rows.length,
    lastUpdated: now()
  };
};

app.get("/health", async (_req, res) => {
  await db.command({ ping: 1 });
  res.json({ success: true, message: "PWA scratch backend running", data: { database: "healthy" } });
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.write("event: connected\n");
  res.write(`data: ${JSON.stringify({ at: now().toISOString() })}\n\n`);
  clients.add(res);
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);
  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

app.get("/employees", async (_req, res) => {
  res.json({ success: true, data: serialize(await getEmployees()) });
});

app.post("/employees", async (req, res) => {
  const employee = {
    employee_id: String(req.body.employee_id || "").trim(),
    name: String(req.body.name || "").trim(),
    department: String(req.body.department || "General").trim(),
    face_photo: String(req.body.face_photo || ""),
    active: true,
    updated_at: now()
  };
  if (!employee.employee_id || !employee.name) {
    return res.status(422).json({ success: false, message: "Employee ID and name are required." });
  }
  await employeesCollection().updateOne(
    { employee_id: employee.employee_id },
    { $set: employee, $setOnInsert: { created_at: now() } },
    { upsert: true }
  );
  publish("employees-updated", employee);
  res.json({ success: true, message: "Employee saved", data: serialize(employee) });
});

app.delete("/employees/:employeeId", async (req, res) => {
  await employeesCollection().deleteOne({ employee_id: req.params.employeeId });
  publish("employees-updated", { employee_id: req.params.employeeId });
  res.json({ success: true, message: "Employee removed" });
});

app.post("/attendance/mark", async (req, res) => {
  const employeeId = String(req.body.employee_id || "").trim();
  const employee = employeeId
    ? await employeesCollection().findOne({ employee_id: employeeId, active: { $ne: false } })
    : (await getEmployees())[0];
  if (!employee) {
    return res.status(400).json({ success: false, message: "Register an employee first." });
  }
  const type = await resolveType(employee.employee_id);
  const attendance = {
    employee_id: employee.employee_id,
    employee_name: employee.name,
    department: employee.department || "General",
    device_id: String(req.body.device_id || "pwa-kiosk"),
    type,
    timestamp: req.body.timestamp ? new Date(req.body.timestamp) : now(),
    source: "pwa",
    created_at: now()
  };
  const result = await attendanceCollection().insertOne(attendance);
  attendance._id = result.insertedId;
  publish("attendance-updated", serialize(attendance));
  res.json({ success: true, message: `Attendance ${type.replace("_", " ")} recorded`, data: serialize(attendance) });
});

app.get("/attendance/today", async (_req, res) => {
  res.json({ success: true, data: serialize(await getTodayAttendance()) });
});

app.get("/summary", async (_req, res) => {
  res.json({ success: true, data: serialize(await summary()) });
});

app.use((error, _req, res, _next) => {
  console.error("[pwa-scratch:error]", error);
  res.status(500).json({ success: false, message: error.message || "Internal server error" });
});

await mongo.connect();
db = mongo.db(DB_NAME);
await employeesCollection().createIndex({ employee_id: 1 }, { unique: true });
await attendanceCollection().createIndex({ timestamp: -1 });
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Attendify PWA scratch backend running on http://0.0.0.0:${PORT}`);
});
