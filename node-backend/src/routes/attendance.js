import { ObjectId } from "mongodb";
import { Router } from "express";

import { getUserFromToken, requireAuth } from "../auth.js";
import { getDb } from "../db.js";
import { publishCompanyEvent, subscribeCompany } from "../realtime.js";
import { createAttendance, resolveAttendanceTypeForDay, verifyDevice, verifyEmployee, isDuplicateAttendance } from "../utils/attendance.js";
import { buildDailyMetrics, DEFAULT_WORK_SCHEDULE } from "../utils/workSchedule.js";
import { istDateKey, istDateRange, istDayRange, nowUtc, toDate } from "../utils/time.js";
import { serialize } from "../utils/serialize.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const attendanceRouter = Router();

const touchKioskDevice = async (companyId, deviceId, deviceName = "") => {
  const cleanDeviceId = String(deviceId || "").trim();
  if (!cleanDeviceId) {
    const error = new Error("Device ID is required.");
    error.status = 400;
    throw error;
  }

  await getDb().collection("devices").updateOne(
    { company_id: companyId, device_id: cleanDeviceId },
    {
      $set: {
        company_id: companyId,
        device_id: cleanDeviceId,
        device_name: String(deviceName || cleanDeviceId).trim(),
        status: "active",
        last_active: nowUtc(),
        updatedAt: nowUtc()
      },
      $setOnInsert: { createdAt: nowUtc() }
    },
    { upsert: true }
  );
};

attendanceRouter.get("/events", asyncHandler(async (req, res) => {
  const token = String(req.query.token || "");
  const user = await getUserFromToken(token);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const unsubscribe = subscribeCompany(user.company_id, res);
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}));

attendanceRouter.use(requireAuth);

const buildRange = ({ filter = "today", date = "", startDate = "", endDate = "" }) => {
  if (date) {
    return { ...istDateRange(date), mode: "date" };
  }
  if (startDate || endDate) {
    if (!startDate || !endDate) {
      const error = new Error("Both startDate and endDate are required for a custom range.");
      error.status = 400;
      throw error;
    }
    return { start: istDateRange(startDate).start, end: istDateRange(endDate).end, mode: "range" };
  }
  if (filter === "today") {
    return { ...istDayRange(), mode: "today" };
  }
  if (filter === "week") {
    const now = new Date();
    return { start: new Date(now.getTime() - 6 * 86400000), end: istDayRange().end, mode: "week" };
  }
  const key = istDateKey();
  return { start: istDateRange(`${key.slice(0, 7)}-01`).start, end: istDayRange().end, mode: "month" };
};

attendanceRouter.get("/today", asyncHandler(async (req, res) => {
  const db = getDb();
  const { start, end, mode } = buildRange(req.query);
  const company = await db.collection("companies").findOne({ _id: new ObjectId(req.user.company_id) });
  const workSchedule = company?.work_schedule || DEFAULT_WORK_SCHEDULE;
  const employees = await db.collection("employees").find(
    { company_id: req.user.company_id },
    { projection: { employee_id: 1, name: 1 } }
  ).toArray();
  const term = String(req.query.search || "").trim().toLowerCase();
  const filteredEmployees = term
    ? employees.filter((item) => item.employee_id.toLowerCase().includes(term) || String(item.name || "").toLowerCase().includes(term))
    : employees;
  const employeeIds = filteredEmployees.map((item) => item.employee_id);
  if (!employeeIds.length) {
    return res.json({ success: true, data: [] });
  }

  const employeeMap = new Map(filteredEmployees.map((item) => [item.employee_id, item.name]));
  const records = await db.collection("attendance")
    .find({ company_id: req.user.company_id, employee_id: { $in: employeeIds }, timestamp: { $gte: start, $lte: end } })
    .sort({ timestamp: -1 })
    .toArray();

  const grouped = new Map();
  for (const record of records) {
    const dateKey = istDateKey(record.timestamp);
    const key = `${record.employee_id}-${dateKey}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        employee_id: record.employee_id,
        employee_name: employeeMap.get(record.employee_id) || record.employee_id,
        date: dateKey,
        records: []
      });
    }
    grouped.get(key).records.push(record);
  }

  const data = [...grouped.values()].map((entry) => {
    const metrics = buildDailyMetrics(entry.records, workSchedule);
    return {
      id: entry.id,
      employee_id: entry.employee_id,
      employee_name: entry.employee_name,
      date: entry.date,
      check_in: metrics.check_in,
      check_out: metrics.check_out,
      status: metrics.in_progress ? "In Progress" : (metrics.session_count > 0 ? "Completed" : "Absent"),
      expected_hours: metrics.expected_hours,
      worked_hours: metrics.worked_hours,
      overtime_hours: metrics.overtime_hours,
      session_count: metrics.session_count,
      sessions: metrics.sessions
    };
  }).sort((a, b) => `${b.date}-${b.employee_name}`.localeCompare(`${a.date}-${a.employee_name}`));

  res.json({ success: true, meta: serialize({ filter_mode: mode, start, end }), data: serialize(data) });
}));

attendanceRouter.get("/summary", asyncHandler(async (req, res) => {
  const db = getDb();
  const { start: todayStart, end: todayEnd } = istDayRange();
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
  const [company, employees, devices, todayRecords, weeklyRecords] = await Promise.all([
    db.collection("companies").findOne({ _id: new ObjectId(req.user.company_id) }),
    db.collection("employees").find({ company_id: req.user.company_id }).toArray(),
    db.collection("devices").find({ company_id: req.user.company_id }).toArray(),
    db.collection("attendance").find({ company_id: req.user.company_id, timestamp: { $gte: todayStart, $lte: todayEnd } }).sort({ timestamp: 1 }).toArray(),
    db.collection("attendance").find({ company_id: req.user.company_id, timestamp: { $gte: weekStart, $lte: todayEnd } }).toArray()
  ]);
  const workSchedule = company?.work_schedule || DEFAULT_WORK_SCHEDULE;
  const byEmployee = new Map();
  for (const record of todayRecords) {
    byEmployee.set(record.employee_id, [...(byEmployee.get(record.employee_id) || []), record]);
  }
  const metrics = [...byEmployee.values()].map((records) => buildDailyMetrics(records, workSchedule));
  const weeklyAttendance = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(weekStart.getTime() + index * 86400000);
    const end = new Date(start.getTime() + 86400000 - 1);
    const present = new Set(weeklyRecords.filter((record) => record.timestamp >= start && record.timestamp <= end && record.type === "check_in").map((record) => record.employee_id));
    return { label: start.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Kolkata" }), present: present.size };
  });
  res.json({
    success: true,
    data: {
      stats: {
        totalEmployees: employees.length,
        presentToday: metrics.filter((item) => item.check_in).length,
        lateEmployees: 0,
        totalWorkHours: Math.round(metrics.reduce((sum, item) => sum + item.worked_hours, 0) * 10) / 10,
        totalOvertimeHours: Math.round(metrics.reduce((sum, item) => sum + item.overtime_hours, 0) * 10) / 10,
        totalDevices: devices.length,
        workSchedule
      },
      charts: { weeklyAttendance, monthlyTrend: [] }
    }
  });
}));

attendanceRouter.post("/mark", asyncHandler(async (req, res) => {
  const timestamp = toDate(req.body.timestamp);
  console.log(
    `[attendance:mark] company=${req.user.company_id} employee=${req.body.employee_id} device=${req.body.device_id} timestamp=${timestamp.toISOString()}`
  );
  await touchKioskDevice(req.user.company_id, req.body.device_id, req.body.device_name);
  await verifyDevice(req.user.company_id, req.body.device_id);
  await verifyEmployee(req.user.company_id, req.body.employee_id);
  const attendance = await createAttendance({
    companyId: req.user.company_id,
    employeeId: req.body.employee_id,
    deviceId: req.body.device_id,
    timestamp
  });
  await getDb().collection("devices").updateOne(
    { company_id: req.user.company_id, device_id: req.body.device_id },
    { $set: { last_active: nowUtc() } }
  );
  publishCompanyEvent(req.user.company_id, "attendance-updated", serialize(attendance));
  res.json({ success: true, message: `Attendance ${attendance.type} recorded successfully.`, data: serialize(attendance) });
}));

attendanceRouter.post("/mark-web", asyncHandler(async (req, res) => {
  const timestamp = toDate(req.body.timestamp);
  console.log(
    `[attendance:mark-web] company=${req.user.company_id} employee=${req.body.employee_id} device=${req.body.device_id || "web-dashboard"} timestamp=${timestamp.toISOString()}`
  );
  await verifyEmployee(req.user.company_id, req.body.employee_id);
  const attendance = await createAttendance({
    companyId: req.user.company_id,
    employeeId: req.body.employee_id,
    deviceId: req.body.device_id || "web-dashboard",
    timestamp,
    source: "web_dashboard"
  });
  publishCompanyEvent(req.user.company_id, "attendance-updated", serialize(attendance));
  res.json({ success: true, message: `Web attendance ${attendance.type} recorded successfully.`, data: serialize(attendance) });
}));

attendanceRouter.post("/sync", asyncHandler(async (req, res) => {
  console.log(`[attendance:sync] company=${req.user.company_id} records=${(req.body.records || []).length}`);
  const results = [];
  for (const record of [...(req.body.records || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))) {
    try {
      const timestamp = toDate(record.timestamp);
      await verifyDevice(req.user.company_id, record.device_id);
      await verifyEmployee(req.user.company_id, record.employee_id);
      const type = await resolveAttendanceTypeForDay(req.user.company_id, record.employee_id, timestamp);
      if (await isDuplicateAttendance(req.user.company_id, record.employee_id, timestamp, type, record.device_id)) {
        results.push({ ...record, success: false, message: "Duplicate attendance record detected." });
        continue;
      }
      const attendance = await createAttendance({
        companyId: req.user.company_id,
        employeeId: record.employee_id,
        deviceId: record.device_id,
        timestamp
      });
      publishCompanyEvent(req.user.company_id, "attendance-updated", serialize(attendance));
      results.push({ employee_id: record.employee_id, device_id: record.device_id, timestamp, success: true, type: attendance.type, attendance_id: attendance._id.toString() });
    } catch (error) {
      results.push({ employee_id: record.employee_id, device_id: record.device_id, timestamp: record.timestamp, success: false, message: error.message });
    }
  }
  res.json({ success: true, message: "Attendance sync processed.", data: serialize(results) });
}));
