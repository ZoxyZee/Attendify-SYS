import { CalendarDays, Camera, CheckCircle2, Download, RotateCcw, ScanFace, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Loader from "../components/Loader";
import StatPill from "../components/StatPill";
import Table from "../components/Table";
import WebcamCapture from "../components/WebcamCapture";
import { useLiveRefresh } from "../hooks/useLiveRefresh";
import { fetchAttendance, markWebAttendance } from "../services/attendanceService";
import { fetchEmployees } from "../services/employeeService";
import { subscribeAttendanceUpdates } from "../services/realtimeService";
import { recognizeEmployee } from "../services/recognitionService";
import { downloadAttendanceCsv } from "../utils/attendanceExport";
import { formatIstDate, formatIstTime, getIstDateInputValue } from "../utils/time";

const filters = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" }
];

const todayString = getIstDateInputValue();

function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [filter, setFilter] = useState("today");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [scanImage, setScanImage] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadAttendance = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await fetchAttendance({
        filter,
        search,
        date: selectedDate,
        startDate,
        endDate
      });
      setAttendance(response.data);
      setMeta(response.meta);
      setError("");
    } catch (loadError) {
      if (!silent) {
        setError(loadError.message);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadAttendance();
    }, 250);

    return () => clearTimeout(timeout);
  }, [endDate, filter, reloadKey, search, selectedDate, startDate]);

  useLiveRefresh(
    () => loadAttendance({ silent: true }),
    [endDate, filter, search, selectedDate, startDate],
    2000
  );

  useEffect(
    () => subscribeAttendanceUpdates(() => loadAttendance({ silent: true })),
    [endDate, filter, search, selectedDate, startDate]
  );

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setEmployees(await fetchEmployees());
      } catch (loadError) {
        setScanStatus(loadError.message);
      }
    };

    loadEmployees();
  }, []);

  const handleScanCapture = async (image) => {
    setScanImage(image);
    setScanResult(null);
    setScanning(true);
    setScanStatus("Recognizing employee...");

    try {
      const match = await recognizeEmployee({ imageBase64: image, employees });
      setScanStatus("Recording attendance...");
      const response = await markWebAttendance({
        employee_id: match.employee_id,
        timestamp: new Date().toISOString()
      });

      setScanResult({
        ...match,
        attendanceType: response.data?.type,
        message: response.message
      });
      setScanStatus(response.message || "Attendance recorded.");
      setReloadKey((current) => current + 1);
    } catch (scanError) {
      setScanStatus(scanError.message);
    } finally {
      setScanning(false);
    }
  };

  const summary = useMemo(() => {
    const totalWorked = attendance.reduce((total, row) => total + (row.worked_hours || 0), 0);
    const totalOvertime = attendance.reduce((total, row) => total + (row.overtime_hours || 0), 0);
    const inProgress = attendance.filter((row) => row.status === "In Progress").length;

    return {
      rows: attendance.length,
      totalWorked: totalWorked.toFixed(1),
      totalOvertime: totalOvertime.toFixed(1),
      inProgress
    };
  }, [attendance]);

  const activeRangeLabel = useMemo(() => {
    if (selectedDate) {
      return `Showing attendance for ${new Date(selectedDate).toLocaleDateString()}`;
    }

    if (startDate && endDate) {
      return `Showing attendance from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
    }

    if (filter === "week") {
      return "Showing attendance for the current week";
    }

    if (filter === "month") {
      return "Showing attendance for the current month";
    }

    return "Showing attendance for today";
  }, [endDate, filter, selectedDate, startDate]);

  const clearCustomDates = () => {
    setSelectedDate("");
    setStartDate("");
    setEndDate("");
  };

  const getExportFilename = () => {
    if (selectedDate) {
      return `attendance-${selectedDate}.csv`;
    }

    if (startDate && endDate) {
      return `attendance-${startDate}-to-${endDate}.csv`;
    }

    return `attendance-${filter}.csv`;
  };

  const columns = [
    {
      key: "employee_name",
      label: "Employee",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{row.employee_name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{row.employee_id}</p>
        </div>
      )
    },
    {
      key: "check_in",
      label: "Check-in",
      render: (row) =>
        row.check_in
          ? formatIstTime(row.check_in)
          : "--"
    },
    {
      key: "check_out",
      label: "Check-out",
      render: (row) =>
        row.check_out
          ? formatIstTime(row.check_out)
          : "--"
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const toneMap = {
          Completed: "success",
          "In Progress": "warning",
          Absent: "danger"
        };

        return <StatPill tone={toneMap[row.status] || "default"}>{row.status}</StatPill>;
      }
    },
    {
      key: "session_count",
      label: "Sessions",
      render: (row) => row.session_count || 0
    },
    {
      key: "worked_hours",
      label: "Worked",
      render: (row) => `${row.worked_hours?.toFixed?.(1) ?? row.worked_hours ?? 0} hrs`
    },
    {
      key: "overtime_hours",
      label: "Overtime",
      render: (row) => `${row.overtime_hours?.toFixed?.(1) ?? row.overtime_hours ?? 0} hrs`
    },
    {
      key: "date",
      label: "Date",
      render: (row) => formatIstDate(`${row.date}T00:00:00+05:30`)
    }
  ];

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-2">
        <h1 className="page-heading">Attendance</h1>
        <p className="page-subheading">Scan attendance from the dashboard, review employee sessions, and filter by time range.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Dashboard scanner</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Uses employee photos saved in Face Registry.</p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
              <ScanFace className="h-5 w-5" />
            </div>
          </div>

          <WebcamCapture
            capturedImage={scanImage}
            disabled={scanning}
            onCapture={handleScanCapture}
            onError={setScanStatus}
          />
        </div>

        <div className="glass-panel p-4">
          <div className="flex h-full flex-col justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Scan result</p>
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                {scanResult ? (
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{scanResult.employee_name}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{scanResult.employee_id}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatPill tone="success">{scanResult.attendanceType || "recorded"}</StatPill>
                        <StatPill tone="default">{Math.round((scanResult.confidence || 0) * 100)}% match</StatPill>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-slate-200 p-3 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                      <Camera className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">Ready to scan</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Capture a face from the camera. The dashboard will match it and mark check-in or check-out automatically.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {scanStatus && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {scanStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel p-4">
          <div className="flex flex-wrap gap-3">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setFilter(item.value);
                  clearCustomDates();
                }}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  filter === item.value && !selectedDate && !startDate && !endDate
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Specific Date</span>
              <input
                type="date"
                className="input"
                value={selectedDate}
                max={todayString}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setStartDate("");
                  setEndDate("");
                }}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">From</span>
              <input
                type="date"
                className="input"
                value={startDate}
                max={endDate || todayString}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setSelectedDate("");
                }}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">To</span>
              <input
                type="date"
                className="input"
                value={endDate}
                min={startDate || undefined}
                max={todayString}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setSelectedDate("");
                }}
              />
            </label>

            <button type="button" onClick={clearCustomDates} className="btn-secondary gap-2 self-end">
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
            <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{activeRangeLabel}</p>
              {meta?.start && meta?.end ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatIstDate(meta.start)} - {formatIstDate(meta.end)}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Records</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary.rows}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Worked</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary.totalWorked} hrs</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Overtime</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary.totalOvertime} hrs</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{summary.inProgress} in progress</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Attendance table</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search by employee name or employee ID inside the selected range.</p>
        </div>

        <div className="flex flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900 lg:w-80">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              placeholder="Search employee"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn-secondary gap-2"
            onClick={() =>
              downloadAttendanceCsv({
                rows: attendance,
                filename: getExportFilename()
              })
            }
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <Loader label="Loading attendance records" />
      ) : (
        <Table
          columns={columns}
          data={attendance}
          emptyTitle="No attendance records"
          emptyText="Try another date, expand the range, or wait for the kiosk to sync recent attendance."
        />
      )}
    </div>
  );
}

export default AttendancePage;
