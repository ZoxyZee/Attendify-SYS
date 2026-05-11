import { Download, FileBarChart, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Card from "../components/Card";
import Loader from "../components/Loader";
import StatPill from "../components/StatPill";
import Table from "../components/Table";
import { fetchAttendance } from "../services/attendanceService";
import { fetchDashboardSummary } from "../services/dashboardService";
import { downloadAttendanceCsv } from "../utils/attendanceExport";

function ReportsPage() {
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReports = async () => {
      try {
        const [attendanceData, summaryData] = await Promise.all([
          fetchAttendance({ filter: "month" }),
          fetchDashboardSummary()
        ]);
        setAttendance(attendanceData.data);
        setSummary(summaryData);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const reportMetrics = useMemo(() => {
    const completed = attendance.filter((item) => item.status === "Completed").length;
    const inProgress = attendance.filter((item) => item.status === "In Progress").length;
    const completionRate = attendance.length ? Math.round((completed / attendance.length) * 100) : 0;
    const overtimeHours = attendance.reduce((total, item) => total + (item.overtime_hours || 0), 0);

    return { completed, inProgress, completionRate, overtimeHours: overtimeHours.toFixed(1) };
  }, [attendance]);

  const columns = [
    { key: "employee_name", label: "Employee" },
    { key: "date", label: "Date", render: (row) => new Date(row.date).toLocaleDateString() },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatPill tone={row.status === "Completed" ? "success" : row.status === "In Progress" ? "warning" : "danger"}>
          {row.status}
        </StatPill>
      )
    },
    {
      key: "session_count",
      label: "Sessions",
      render: (row) => row.session_count || 0
    },
    {
      key: "work_hours",
      label: "Work Session",
      render: (row) => `${row.worked_hours || 0} hrs`
    },
    {
      key: "overtime_hours",
      label: "Overtime",
      render: (row) => `${row.overtime_hours || 0} hrs`
    }
  ];

  if (loading) {
    return <Loader label="Preparing reports" />;
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="page-heading">Reports</h1>
          <p className="page-subheading">Monthly attendance overview and operational performance trends.</p>
        </div>
        <button
          type="button"
          className="btn-secondary gap-2"
          onClick={() => downloadAttendanceCsv({ rows: attendance, filename: "attendify-monthly-report.csv" })}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <Card title="Completed sessions" value={reportMetrics.completed} icon={FileBarChart} />
        <Card title="Open sessions" value={reportMetrics.inProgress} icon={TrendingUp} accent="warning" />
        <Card
          title="Overtime hours"
          value={`${reportMetrics.overtimeHours} hrs`}
          subtitle={`Expected day: ${summary?.stats?.workSchedule?.start_time || "09:00"} - ${summary?.stats?.workSchedule?.end_time || "18:00"}`}
          icon={FileBarChart}
          accent="success"
        />
      </div>

      <div className="glass-panel p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Performance snapshot</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Blend of attendance records and summary metrics from the live system.
            </p>
          </div>
          <StatPill tone="success">{summary?.stats?.presentToday || 0} present today</StatPill>
        </div>
      </div>

      <Table
        columns={columns}
        data={attendance}
        emptyTitle="No report data"
        emptyText="Monthly attendance trends will show here as attendance accumulates."
      />
    </div>
  );
}

export default ReportsPage;
