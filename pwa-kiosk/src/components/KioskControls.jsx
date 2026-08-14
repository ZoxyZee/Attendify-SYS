import { Camera, RefreshCw, ScanFace, WifiOff } from "lucide-react";

import { formatIstTime } from "../utils/time";
import { StatusMessage } from "./StatusMessage";

export function KioskControls({
  autoScanning,
  employees,
  lastMark,
  loading,
  marking,
  online,
  onManualScan,
  onReloadEmployees,
  onToggleScanning,
  selectedEmployee,
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

      <div className="scanner-mode">
        <ScanFace size={22} />
        <div>
          <strong>{autoScanning ? "Live face scanner active" : "Scanner paused"}</strong>
          <span>Registered faces only. Unknown faces are ignored.</span>
        </div>
      </div>

      <button className="mark-button" type="button" onClick={onManualScan} disabled={marking || loading}>
        {marking ? <RefreshCw className="spin" size={24} /> : <Camera size={24} />}
        {marking ? "Scanning..." : "Scan Face Now"}
      </button>

      <button className="ghost-button" type="button" onClick={onToggleScanning} disabled={loading}>
        <ScanFace size={18} />
        {autoScanning ? "Pause live scan" : "Start live scan"}
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
