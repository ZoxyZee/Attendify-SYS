const base = process.env.PWA_SCRATCH_API_URL || "http://127.0.0.1:5055";

const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(`${response.status} ${payload.message || "Request failed"}`);
  }
  return payload.data;
};

const waitRealtimeEvent = () =>
  new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Realtime event timed out"));
    }, 5000);
    fetch(`${base}/events`, { signal: controller.signal })
      .then(async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          if (text.includes("event: attendance-updated")) {
            clearTimeout(timer);
            controller.abort();
            resolve(true);
            break;
          }
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          clearTimeout(timer);
          reject(error);
        }
      });
  });

const stamp = Date.now();
const employeeId = `CHECK-${stamp}`;

const health = await request("/health");
await request("/employees", {
  method: "POST",
  body: JSON.stringify({ employee_id: employeeId, name: "Scratch Check User", department: "QA" })
});

const realtime = waitRealtimeEvent();
const started = performance.now();
const attendance = await request("/attendance/mark", {
  method: "POST",
  body: JSON.stringify({ employee_id: employeeId, device_id: "check-script" })
});
const markMs = Math.round(performance.now() - started);
await realtime;

const [employees, rows, summary] = await Promise.all([
  request("/employees"),
  request("/attendance/today"),
  request("/summary")
]);

console.log(JSON.stringify({
  backend: health.database,
  employeeCreated: employees.some((employee) => employee.employee_id === employeeId),
  attendanceType: attendance.type,
  markMs,
  realtimeEventReceived: true,
  todayRows: rows.length,
  presentToday: summary.presentToday,
  recordsToday: summary.recordsToday
}, null, 2));
