import { Camera, CheckCircle2, Loader2, RefreshCcw, Smartphone, Wifi } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { markPwaAttendance } from "../services/attendanceService";
import { fetchEmployees } from "../services/employeeService";
import { subscribeAttendanceUpdates } from "../services/realtimeService";

const getDeviceId = () => {
  const key = "attendify_pwa_device_id";
  const saved = localStorage.getItem(key);
  if (saved) {
    return saved;
  }
  const next = `PWA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  localStorage.setItem(key, next);
  return next;
};

function PwaKioskPage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState("Loading employees...");
  const [cameraStatus, setCameraStatus] = useState("Camera idle");
  const [busy, setBusy] = useState(false);
  const [lastRecord, setLastRecord] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [deviceId] = useState(getDeviceId);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.employee_id === selectedId) || employees[0] || null,
    [employees, selectedId]
  );

  const loadEmployees = async () => {
    const data = await fetchEmployees();
    setEmployees(data);
    setSelectedId((current) => current || data[0]?.employee_id || "");
    setStatus(data.length ? "Ready" : "Add employees from dashboard first");
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("Camera not supported in this browser");
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
      setCameraStatus(error.message || "Camera permission blocked");
    }
  };

  useEffect(() => {
    loadEmployees().catch((error) => setStatus(error.message));
    startCamera();

    const unsubscribe = subscribeAttendanceUpdates(() => {
      loadEmployees().catch(() => {});
      setStatus("Realtime updated");
    });

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      unsubscribe();
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) {
      setStatus("Use browser menu > Add to Home screen");
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const markAttendance = async () => {
    if (!selectedEmployee) {
      setStatus("Select an employee first");
      return;
    }

    setBusy(true);
    setStatus("Marking attendance...");
    try {
      const response = await markPwaAttendance({
        employee_id: selectedEmployee.employee_id,
        device_id: deviceId
      });
      setLastRecord(response.data);
      setStatus(response.message || "Attendance recorded");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-soft">
      <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-[1fr_24rem]">
        <section className="relative flex min-h-[34rem] items-end justify-center overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover opacity-75" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/20" />
          <div className="absolute top-5 flex w-full items-center justify-between px-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 px-4 py-3 backdrop-blur-xl">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-sky-200">Attendify PWA</p>
              <h1 className="mt-1 text-xl font-semibold">Phone Kiosk</h1>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/15 px-4 py-3 text-sm font-semibold text-emerald-100">
              <Wifi className="mr-2 inline h-4 w-4" />
              Live
            </div>
          </div>

          <div className="relative z-10 w-full max-w-xl px-5 pb-8 text-center">
            <div className="mx-auto mb-5 grid h-44 w-44 place-items-center rounded-full border-4 border-white/45 bg-white/10">
              <div className="grid h-24 w-24 place-items-center rounded-[2rem] border-4 border-white/80">
                <Camera className="h-10 w-10" />
              </div>
            </div>
            <h2 className="text-4xl font-bold tracking-tight">Tap Once To Mark Attendance</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-200">
              This PWA is connected to the same backend as the dashboard. Attendance appears realtime on the main dashboard.
            </p>
          </div>
        </section>

        <aside className="border-l border-white/10 bg-slate-950 p-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Device</p>
                <p className="mt-1 font-semibold">{deviceId}</p>
              </div>
              <Smartphone className="h-6 w-6 text-sky-300" />
            </div>
            <p className="mt-3 text-sm text-slate-300">{cameraStatus}</p>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Selected Employee</p>
            <select
              value={selectedEmployee?.employee_id || ""}
              onChange={(event) => setSelectedId(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
            >
              {employees.map((employee) => (
                <option key={employee.employee_id} value={employee.employee_id}>
                  {employee.name} - {employee.employee_id}
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => loadEmployees()} className="btn-secondary !rounded-2xl !border-white/10 !bg-white/10 !text-white">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
              <button type="button" onClick={installApp} className="btn-secondary !rounded-2xl !border-white/10 !bg-white/10 !text-white">
                Install
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Live Diagnostic</p>
            <p className="mt-2 min-h-12 text-sm leading-6 text-white">{status}</p>
            {lastRecord ? (
              <p className="mt-2 rounded-2xl bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                {lastRecord.type?.replace("_", " ")} saved
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={markAttendance}
            disabled={busy || !selectedEmployee}
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-3xl bg-indigo-500 px-5 py-5 text-lg font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
            {busy ? "Marking..." : "Mark Attendance"}
          </button>
        </aside>
      </div>
    </div>
  );
}

export default PwaKioskPage;
