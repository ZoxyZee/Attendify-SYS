import { Camera, CheckCircle2, Clock3, Plus, RefreshCcw, Trash2, UserPlus, Users, Wifi } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const host = window.location.hostname || "127.0.0.1";
const API = import.meta.env.VITE_API_URL || `http://${host}:5055`;

const request = async (path, options = {}) => {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "Request failed");
  }
  return payload.data;
};

const deviceId = () => {
  const key = "attendify_fast_pwa_device";
  const saved = localStorage.getItem(key);
  if (saved) return saved;
  const next = `PWA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  localStorage.setItem(key, next);
  return next;
};

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({ totalEmployees: 0, presentToday: 0, recordsToday: 0 });
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState("Starting...");
  const [cameraStatus, setCameraStatus] = useState("Camera idle");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ employee_id: "", name: "", department: "" });
  const [mode, setMode] = useState("kiosk");
  const [appDeviceId] = useState(deviceId);

  const selectedEmployee = useMemo(
    () => employees.find((item) => item.employee_id === selectedId) || employees[0] || null,
    [employees, selectedId]
  );

  const loadAll = async () => {
    const [nextEmployees, nextAttendance, nextSummary] = await Promise.all([
      request("/employees"),
      request("/attendance/today"),
      request("/summary")
    ]);
    setEmployees(nextEmployees);
    setAttendance(nextAttendance);
    setSummary(nextSummary);
    setSelectedId((current) => current || nextEmployees[0]?.employee_id || "");
    setStatus("Live");
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("Camera unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus("Camera ready");
    } catch (error) {
      setCameraStatus(error.message || "Camera blocked");
    }
  };

  useEffect(() => {
    loadAll().catch((error) => setStatus(error.message));
    startCamera();
    if ("serviceWorker" in navigator && !import.meta.env.DEV) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const events = new EventSource(`${API}/events`);
    events.addEventListener("connected", () => setStatus("Realtime connected"));
    events.addEventListener("attendance-updated", () => loadAll().catch((error) => setStatus(error.message)));
    events.addEventListener("employees-updated", () => loadAll().catch((error) => setStatus(error.message)));
    events.onerror = () => setStatus("Realtime reconnecting...");
    const timer = setInterval(() => loadAll().catch(() => {}), 5000);
    return () => {
      events.close();
      clearInterval(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const saveEmployee = async (event) => {
    event.preventDefault();
    if (!form.employee_id.trim() || !form.name.trim()) {
      setStatus("Employee ID and name required");
      return;
    }
    setBusy(true);
    const started = performance.now();
    try {
      await request("/employees", {
        method: "POST",
        body: JSON.stringify({ ...form, face_photo: "pwa-camera-ready" })
      });
      setSelectedId(form.employee_id.trim());
      setForm({ employee_id: "", name: "", department: "" });
      await loadAll();
      setStatus(`Employee saved in ${Math.round(performance.now() - started)}ms`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };

  const markAttendance = async () => {
    if (!selectedEmployee) {
      setStatus("Register/select employee first");
      return;
    }
    setBusy(true);
    const started = performance.now();
    try {
      const record = await request("/attendance/mark", {
        method: "POST",
        body: JSON.stringify({
          employee_id: selectedEmployee.employee_id,
          device_id: appDeviceId,
          timestamp: new Date().toISOString()
        })
      });
      await loadAll();
      setStatus(`${record.employee_name} ${record.type.replace("_", " ")} saved in ${Math.round(performance.now() - started)}ms`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };

  const removeEmployee = async (employeeId) => {
    if (!window.confirm("Remove this employee?")) return;
    await request(`/employees/${encodeURIComponent(employeeId)}`, { method: "DELETE" });
    await loadAll();
  };

  const formatTime = (value) =>
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date(value));

  return (
    <main className="app">
      <section className="topbar">
        <div>
          <p className="eyebrow">ATTENDIFY FAST PWA</p>
          <h1>{mode === "kiosk" ? "Phone Kiosk" : "Realtime Dashboard"}</h1>
        </div>
        <div className="tabs">
          <button className={mode === "kiosk" ? "active" : ""} onClick={() => setMode("kiosk")}>Kiosk</button>
          <button className={mode === "dashboard" ? "active" : ""} onClick={() => setMode("dashboard")}>Dashboard</button>
        </div>
      </section>

      {mode === "kiosk" ? (
        <section className="kiosk">
          <div className="cameraPane">
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="cameraOverlay">
              <div className="scanRing"><Camera size={54} /></div>
              <h2>Tap Once To Mark Attendance</h2>
              <p>No heavy ML wait. Direct fast write to backend, realtime dashboard update.</p>
            </div>
          </div>
          <aside className="side">
            <div className="card live">
              <Wifi size={18} />
              <span>{status}</span>
            </div>
            <div className="card">
              <p className="label">Device</p>
              <strong>{appDeviceId}</strong>
              <small>{cameraStatus}</small>
            </div>
            <div className="card">
              <p className="label">Employee</p>
              <select value={selectedEmployee?.employee_id || ""} onChange={(event) => setSelectedId(event.target.value)}>
                {employees.map((employee) => (
                  <option key={employee.employee_id} value={employee.employee_id}>
                    {employee.name} - {employee.employee_id}
                  </option>
                ))}
              </select>
              {!employees.length ? <small>No employee yet. Register below.</small> : null}
            </div>
            <button className="markBtn" disabled={busy || !selectedEmployee} onClick={markAttendance}>
              {busy ? "Working..." : "Mark Attendance"}
            </button>
          </aside>
        </section>
      ) : null}

      <section className="dashboard">
        <form className="panel form" onSubmit={saveEmployee}>
          <div className="panelHead">
            <UserPlus size={22} />
            <div>
              <h3>Register Employee</h3>
              <p>Fast registration. Face camera stays optional for this PWA flow.</p>
            </div>
          </div>
          <input placeholder="Employee ID" value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })} />
          <input placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input placeholder="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
          <button disabled={busy}><Plus size={18} /> Save Employee</button>
        </form>

        <div className="stats">
          <div className="stat"><Users /><p>Employees</p><strong>{summary.totalEmployees}</strong></div>
          <div className="stat"><CheckCircle2 /><p>Present</p><strong>{summary.presentToday}</strong></div>
          <div className="stat"><Clock3 /><p>Records</p><strong>{summary.recordsToday}</strong></div>
        </div>

        <div className="panel listPanel">
          <div className="panelHead">
            <RefreshCcw size={22} onClick={() => loadAll()} />
            <div>
              <h3>Employees</h3>
              <p>Manual records only. Select one for kiosk attendance.</p>
            </div>
          </div>
          {employees.map((employee) => (
            <div className="employee" key={employee.employee_id}>
              <button className="employeePick" onClick={() => { setSelectedId(employee.employee_id); setMode("kiosk"); }}>
                <strong>{employee.name}</strong>
                <span>{employee.employee_id} - {employee.department}</span>
              </button>
              <button className="iconBtn" onClick={() => removeEmployee(employee.employee_id)}><Trash2 size={16} /></button>
            </div>
          ))}
          {!employees.length ? <div className="empty">No employees registered.</div> : null}
        </div>

        <div className="panel attendancePanel">
          <h3>Live Attendance</h3>
          {attendance.map((row) => (
            <div className="attendanceRow" key={row._id}>
              <strong>{row.employee_name}</strong>
              <span>{row.type.replace("_", " ")}</span>
              <span>{row.device_id}</span>
              <span>{formatTime(row.timestamp)}</span>
            </div>
          ))}
          {!attendance.length ? <div className="empty">No attendance today.</div> : null}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
