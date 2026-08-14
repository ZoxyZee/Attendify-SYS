import { getDb } from "../db.js";
import { istDayRange, toDate, nowUtc } from "./time.js";

const DUPLICATE_WINDOW_MS = 60 * 1000;
const MIN_PUNCH_GAP_MS = 60 * 1000;

export const resolveAttendanceTypeForDay = async (companyId, employeeId, timestamp) => {
  const db = getDb();
  const { start, end } = istDayRange(timestamp);
  const records = await db.collection("attendance")
    .find({
      company_id: companyId,
      employee_id: employeeId,
      timestamp: { $gte: start, $lte: end }
    })
    .sort({ timestamp: 1 })
    .toArray();

  if (!records.length) {
    return "check_in";
  }

  return records[records.length - 1].type === "check_in" ? "check_out" : "check_in";
};

export const isDuplicateAttendance = async (companyId, employeeId, timestamp, type, deviceId) => {
  const db = getDb();
  const exact = await db.collection("attendance").findOne({
    company_id: companyId,
    employee_id: employeeId,
    timestamp,
    type
  });
  if (exact) {
    return true;
  }

  const query = {
    company_id: companyId,
    employee_id: employeeId,
    type,
    timestamp: {
      $gte: new Date(timestamp.getTime() - DUPLICATE_WINDOW_MS),
      $lte: new Date(timestamp.getTime() + DUPLICATE_WINDOW_MS)
    }
  };
  if (deviceId) {
    query.device_id = deviceId;
  }
  return Boolean(await db.collection("attendance").findOne(query));
};

export const createAttendance = async ({ companyId, employeeId, deviceId, timestamp, source = "kiosk" }) => {
  const db = getDb();
  const cleanTimestamp = toDate(timestamp);
  const lastRecord = await db.collection("attendance")
    .find({ company_id: companyId, employee_id: employeeId })
    .sort({ timestamp: -1 })
    .limit(1)
    .next();
  if (lastRecord && Math.abs(cleanTimestamp.getTime() - lastRecord.timestamp.getTime()) < MIN_PUNCH_GAP_MS) {
    const error = new Error("Attendance already marked recently. Wait a minute before marking again.");
    error.status = 409;
    throw error;
  }
  const type = await resolveAttendanceTypeForDay(companyId, employeeId, cleanTimestamp);
  if (await isDuplicateAttendance(companyId, employeeId, cleanTimestamp, type, deviceId)) {
    const error = new Error("Duplicate attendance record detected.");
    error.status = 409;
    throw error;
  }

  const attendance = {
    company_id: companyId,
    employee_id: employeeId,
    device_id: deviceId,
    timestamp: cleanTimestamp,
    type,
    synced: true,
    source,
    createdAt: nowUtc(),
    updatedAt: nowUtc()
  };
  const result = await db.collection("attendance").insertOne(attendance);
  attendance._id = result.insertedId;
  return attendance;
};

export const verifyEmployee = async (companyId, employeeId) => {
  const employee = await getDb().collection("employees").findOne({
    company_id: companyId,
    employee_id: employeeId,
    status: "active"
  });
  if (!employee) {
    const error = new Error("Employee does not belong to this company or is inactive.");
    error.status = 400;
    throw error;
  }
  return employee;
};

export const verifyDevice = async (companyId, deviceId) => {
  const device = await getDb().collection("devices").findOne({ company_id: companyId, device_id: deviceId });
  if (!device) {
    const error = new Error("Device is not registered for this company.");
    error.status = 400;
    throw error;
  }
  return device;
};
