export const DEFAULT_WORK_SCHEDULE = {
  start_time: "09:00",
  end_time: "18:00",
  timezone: "Asia/Calcutta"
};

const parseMinutes = (value = "") => {
  const [hours, minutes] = String(value).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
};

export const expectedHours = (schedule = DEFAULT_WORK_SCHEDULE) =>
  Math.max(0, parseMinutes(schedule.end_time) - parseMinutes(schedule.start_time)) / 60;

export const buildDailyMetrics = (records, schedule = DEFAULT_WORK_SCHEDULE) => {
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const sessions = [];
  let openCheckIn = null;

  for (const record of sorted) {
    if (record.type === "check_in") {
      openCheckIn = record.timestamp;
    } else if (record.type === "check_out" && openCheckIn) {
      const worked = Math.max(0, (record.timestamp - openCheckIn) / 3600000);
      sessions.push({ check_in: openCheckIn, check_out: record.timestamp, worked_hours: worked });
      openCheckIn = null;
    }
  }

  const workedHours = sessions.reduce((total, session) => total + session.worked_hours, 0);
  const expected = expectedHours(schedule);
  return {
    sessions,
    session_count: sessions.length,
    check_in: sessions[0]?.check_in || openCheckIn,
    check_out: sessions[sessions.length - 1]?.check_out || null,
    worked_hours: Math.round(workedHours * 10) / 10,
    expected_hours: Math.round(expected * 10) / 10,
    overtime_hours: Math.round(Math.max(0, workedHours - expected) * 10) / 10,
    in_progress: Boolean(openCheckIn)
  };
};
