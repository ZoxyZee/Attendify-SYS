import { useCallback, useEffect, useMemo, useState } from "react";
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
import { formatIstTime } from "./utils/time";

import "./styles.css";

function App() {
  const { token, user, login, logout } = useAuthSession();
  const { videoRef, cameraState } = useCameraPreview(Boolean(token));
  const online = useOnlineStatus();
  const deviceId = useMemo(getDeviceId, []);
  const [employees, setEmployees] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState({ tone: "info", text: "Ready to connect." });
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
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
      setSelectedId((current) => current || list[0]?.employee_id || "");
      setStatus({ tone: "success", text: `${list.length} employees synced from dashboard backend.` });
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

  const markAttendance = async () => {
    if (!selectedId) {
      setStatus({ tone: "danger", text: "Select an employee first." });
      return;
    }

    setMarking(true);
    const started = performance.now();
    setStatus({ tone: "info", text: "Marking attendance..." });

    try {
      const response = await markWebAttendance(token, {
        employee_id: selectedId,
        device_id: deviceId,
        timestamp: new Date().toISOString()
      });
      const elapsed = Math.round(performance.now() - started);
      setLastMark({
        employeeId: selectedId,
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
  };

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

  const filteredEmployees = employees.filter((employee) => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return (
      employee.employee_id?.toLowerCase().includes(term) ||
      employee.name?.toLowerCase().includes(term) ||
      employee.department?.toLowerCase().includes(term)
    );
  });

  const selectedEmployee = employees.find((employee) => employee.employee_id === selectedId);

  if (!token) {
    return <LoginScreen loading={loading} onLogin={submitLogin} status={status} />;
  }

  return (
    <KioskScreen
      cameraState={cameraState}
      employees={employees}
      filteredEmployees={filteredEmployees}
      lastMark={lastMark}
      loading={loading}
      marking={marking}
      online={online}
      query={query}
      selectedEmployee={selectedEmployee}
      selectedId={selectedId}
      status={status}
      title={user?.company_name || "Front Desk"}
      videoRef={videoRef}
      onLogout={logout}
      onMark={markAttendance}
      onQueryChange={setQuery}
      onReloadEmployees={loadEmployees}
      onSelectEmployee={setSelectedId}
    />
  );
}

createRoot(document.getElementById("root")).render(<App />);
