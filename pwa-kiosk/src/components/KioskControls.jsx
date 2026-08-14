import { Camera, RefreshCw, WifiOff } from "lucide-react";

import { formatIstTime } from "../utils/time";
import { EmployeePicker } from "./EmployeePicker";
import { StatusMessage } from "./StatusMessage";

export function KioskControls({
  employees,
  filteredEmployees,
  lastMark,
  loading,
  marking,
  online,
  onMark,
  onQueryChange,
  onReloadEmployees,
  onSelectEmployee,
  query,
  selectedEmployee,
  selectedId,
  status
}) {
  return (
    <section className="action-panel">
      <div className="status-grid">
        <div className="mini-card">
          <span>Connection</span>
          <strong>{online ? "Online" : "Offline"}</strong>
        </div>
        <div className="mini-card">
          <span>Employees</span>
          <strong>{employees.length}</strong>
        </div>
        <div className="mini-card">
          <span>IST</span>
          <strong>{formatIstTime()}</strong>
        </div>
      </div>

      <StatusMessage tone={status.tone}>{status.text}</StatusMessage>

      <EmployeePicker
        employees={filteredEmployees}
        query={query}
        selectedId={selectedId}
        onQueryChange={onQueryChange}
        onSelect={onSelectEmployee}
      />

      <button className="mark-button" type="button" onClick={onMark} disabled={marking || loading || !selectedId}>
        {marking ? <RefreshCw className="spin" size={24} /> : <Camera size={24} />}
        {marking ? "Marking..." : "Mark Attendance"}
      </button>

      {lastMark && (
        <div className="last-mark">
          <strong>{selectedEmployee?.name || lastMark.employeeId}</strong>
          <span>
            {lastMark.type} at {lastMark.time} IST
          </span>
          <small>{lastMark.elapsed} ms API response</small>
        </div>
      )}

      <button className="ghost-button" type="button" onClick={onReloadEmployees} disabled={loading}>
        <RefreshCw size={18} className={loading ? "spin" : ""} />
        Sync employees
      </button>

      {!online && (
        <div className="offline-note">
          <WifiOff size={18} />
          Network offline. Attendance needs backend access.
        </div>
      )}
    </section>
  );
}
