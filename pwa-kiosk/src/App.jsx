import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { LoginScreen } from "./components/LoginScreen";
import { useAuthSession } from "./hooks/useAuthSession";
import { useCameraPreview } from "./hooks/useCameraPreview";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useRealtimeAttendance } from "./hooks/useRealtimeAttendance";
import { useServiceWorker } from "./hooks/useServiceWorker";
import { KioskScreen } from "./screens/KioskScreen";
import { fetchEmployees, markWebAttendance } from "./services/apiClient";
import { getDeviceId } from "./utils/device";
import { recognizeFromFrame } from "./utils/faceMatch";
import { formatIstTime } from "./utils/time";

import "./styles.css";

function App() {
  const { token, user, login, logout } = useAuthSession();
  const { videoRef, cameraState, cameraReady, captureFrame } = useCameraPreview(Boolean(token));
  const online = useOnlineStatus();
  const deviceId = useMemo(getDeviceId, []);
  const cooldownRef = useRef(new Map());
  const scanningRef = useRef(false);
  const [employees, setEmployees] = useState([]);
  const [status, setStatus] = useState({ tone: "info", text: "Ready to connect." });
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [autoScanning, setAutoScanning] = useState(true);
  const [lastMark, setLastMark] = useState(null);

  useServiceWorker();

  const loadEmployees = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetchEmployees(token);
      const list = response.data || [];
      setEmployees(list);
      const enrolled = list.filter((employee) => employee.face_image_base64).length;
      setStatus({ tone: "success", text: `${enrolled}/${list.length} registered faces synced.` });
    } catch (error) {
      setStatus({ tone: "danger", text: error.message });
    } finally {
      setLoading(false);
    }
  }, [token]);

  const submitLogin = async (credentials) => {
    setLoading(true);
    setStatus({ tone: "info", text: "Signing in..." });
    try {
      await login(credentials);
      setStatus({ tone: "success", text: "Connected. Loading employees..." });
    } catch (error) {
      setStatus({ tone: "danger", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const markAttendanceForEmployee = useCallback(async (employee) => {
    if (!employee?.employee_id) {
      setStatus({ tone: "danger", text: "No employee matched." });
      return;
    }

    const now = Date.now();
    const cooldownUntil = cooldownRef.current.get(employee.employee_id) || 0;
    if (now < cooldownUntil) {
      const waitSeconds = Math.ceil((cooldownUntil - now) / 1000);
      setStatus({ tone: "warning", text: `${employee.employee_name || employee.employee_id} already marked. Wait ${waitSeconds}s.` });
      return;
    }

    setMarking(true);
    const started = performance.now();
    setStatus({ tone: "info", text: `Matched ${employee.employee_name || employee.employee_id}. Marking attendance...` });

    try {
      const response = await markWebAttendance(token, {
        employee_id: employee.employee_id,
        device_id: deviceId,
        timestamp: new Date().toISOString()
      });
      const elapsed = Math.round(performance.now() - started);
      cooldownRef.current.set(employee.employee_id, Date.now() + 90000);
      setLastMark({
        employeeId: employee.employee_id,
        employeeName: employee.employee_name,
        type: response.data?.type || "recorded",
        time: formatIstTime(),
        elapsed
      });
      setStatus({ tone: "success", text: `Attendance ${response.data?.type || "recorded"} in ${elapsed} ms.` });
    } catch (error) {
      setStatus({ tone: "danger", text: error.message });
    } finally {
      setMarking(false);
    }
  }, [deviceId, token]);

  const scanFrameAndMark = useCallback(async () => {
    if (!cameraReady || marking || loading || scanningRef.current) {
      return;
    }

    scanningRef.current = true;
    try {
      const frame = captureFrame();
      const match = await recognizeFromFrame({ frame, employees });
      await markAttendanceForEmployee(match);
    } catch (error) {
      setStatus({ tone: "warning", text: error.message });
    } finally {
      scanningRef.current = false;
    }
  }, [cameraReady, captureFrame, employees, loading, marking, markAttendanceForEmployee]);

  const onRealtimeUpdate = useCallback((data) => {
    setStatus({
      tone: "success",
      text: data ? `Dashboard updated: ${data.employee_id} ${data.type}.` : "Dashboard updated in realtime."
    });
  }, []);

  const onRealtimeReconnect = useCallback(() => {
    setStatus({ tone: "warning", text: "Realtime reconnecting..." });
  }, []);

  useRealtimeAttendance(token, onRealtimeUpdate, onRealtimeReconnect);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (!token || !autoScanning) {
      return undefined;
    }

    const interval = setInterval(scanFrameAndMark, 1500);
    return () => clearInterval(interval);
  }, [autoScanning, scanFrameAndMark, token]);

  const selectedEmployee = lastMark
    ? employees.find((employee) => employee.employee_id === lastMark.employeeId)
    : null;

  if (!token) {
    return <LoginScreen loading={loading} onLogin={submitLogin} status={status} />;
  }

  return (
    <KioskScreen
      autoScanning={autoScanning}
      cameraState={cameraState}
      employees={employees}
      lastMark={lastMark}
      loading={loading}
      marking={marking}
      online={online}
      selectedEmployee={selectedEmployee}
      status={status}
      title={user?.company_name || "Front Desk"}
      videoRef={videoRef}
      onLogout={logout}
      onManualScan={scanFrameAndMark}
      onReloadEmployees={loadEmployees}
      onToggleScanning={() => setAutoScanning((current) => !current)}
    />
  );
}

createRoot(document.getElementById("root")).render(<App />);
