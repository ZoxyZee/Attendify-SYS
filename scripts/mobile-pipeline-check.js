const base = process.env.ATTENDIFY_API_URL || "http://192.168.29.215:5000";
const email = `mobile-check-${Date.now()}@example.com`;
const password = "password123";

const sampleEmbedding = Array.from({ length: 192 }, (_, index) => Math.sin(index + 1));
const magnitude = Math.sqrt(sampleEmbedding.reduce((sum, value) => sum + value * value, 0)) || 1;
const normalizedEmbedding = sampleEmbedding.map((value) => value / magnitude);

async function request(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  const register = await request("/auth/register-company", {
    method: "POST",
    body: JSON.stringify({
      company_name: "Mobile Check Co",
      admin_email: email,
      subscription_plan: "basic",
      name: "Mobile Admin",
      password
    })
  });
  const token = register.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const me = await request("/auth/me", { headers: authHeaders });
  const device = await request("/devices/register", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      device_id: "PHONE-KIOSK-01",
      device_name: "Phone Kiosk Check"
    })
  });

  const employeePayload = {
    employee_id: "MOB001",
    name: "Mobile Check Employee",
    department: "QA",
    face_label: "MOB001",
    face_embedding: normalizedEmbedding,
    face_embeddings: [
      normalizedEmbedding,
      normalizedEmbedding,
      normalizedEmbedding,
      normalizedEmbedding,
      normalizedEmbedding
    ],
    embedding_engine: "local",
    face_registered_at: new Date().toISOString(),
    status: "active"
  };

  const created = await request("/employees/create", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(employeePayload)
  });
  const updated = await request("/employees/update", {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ ...employeePayload, department: "QA Updated" })
  });
  const employees = await request("/employees/list", { headers: authHeaders });
  const attendance = await request("/attendance/mark", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      employee_id: "MOB001",
      device_id: "PHONE-KIOSK-01",
      timestamp: new Date().toISOString()
    })
  });
  const sync = await request("/attendance/sync", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      records: [
        {
          employee_id: "MOB001",
          device_id: "PHONE-KIOSK-01",
          timestamp: new Date(Date.now() + 1000).toISOString()
        }
      ]
    })
  });
  const summary = await request("/attendance/summary", { headers: authHeaders });
  const today = await request("/attendance/today", { headers: authHeaders });

  console.log(JSON.stringify({
    base,
    email,
    me: me.data.user.email,
    deviceRegistered: Boolean(device.data),
    employeeCount: employees.data.length,
    createdEmbeddings: created.data.face_embeddings.length,
    updatedDepartment: updated.data.department,
    attendanceType: attendance.data.type,
    syncResults: sync.data.map((item) => ({
      success: item.success,
      result: item.message || item.type
    })),
    presentToday: summary.data.stats.presentToday,
    totalDevices: summary.data.stats.totalDevices,
    todayRows: today.data.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
