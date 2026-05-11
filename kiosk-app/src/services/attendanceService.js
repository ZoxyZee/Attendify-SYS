import { addAttendanceLog, getLatestAttendanceForEmployee } from "./database";

const LOCAL_DUPLICATE_WINDOW_MS = 60 * 1000;

export const assertAttendanceAllowed = async (db, payload) => {
  const latestRecord = await getLatestAttendanceForEmployee(db, payload.employee_id);

  if (!latestRecord) {
    return;
  }

  const latestTimestamp = new Date(latestRecord.timestamp).getTime();
  const nextTimestamp = new Date(payload.timestamp).getTime();

  if (Number.isNaN(latestTimestamp) || Number.isNaN(nextTimestamp)) {
    return;
  }

  if (Math.abs(nextTimestamp - latestTimestamp) < LOCAL_DUPLICATE_WINDOW_MS) {
    throw new Error("Attendance already captured recently. Please wait a moment before scanning again.");
  }
};

export const queueAttendanceRecord = async (db, payload) =>
  addAttendanceLog(db, {
    ...payload,
    status: payload.synced ? "recorded" : "queued"
  });
