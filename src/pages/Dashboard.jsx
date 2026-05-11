import {
  Activity,
  Clock3,
  TrendingUp,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  BarElement
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

import Card from "../components/Card";
import Loader from "../components/Loader";
import { fetchDashboardSummary } from "../services/dashboardService";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetchDashboardSummary();
        setSummary(response);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return <Loader label="Loading dashboard insights" />;
  }

  if (error) {
    return <div className="glass-panel p-6 text-sm text-rose-600 dark:text-rose-300">{error}</div>;
  }

  const stats = summary?.stats || {};
  const charts = summary?.charts || {};

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="page-heading">Command Center</h1>
          <p className="page-subheading">
            Live operational view of employee attendance, device status, and daily movement.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Total Employees" value={stats.totalEmployees || 0} subtitle="Registered staff across your organization" icon={Users} />
        <Card title="Present Today" value={stats.presentToday || 0} subtitle="Employees with active check-ins today" icon={Activity} accent="success" />
        <Card title="Late Employees" value={stats.lateEmployees || 0} subtitle="Check-ins after the expected start time" icon={TrendingUp} accent="warning" />
        <Card title="Total Work Hours" value={stats.totalWorkHours || 0} subtitle="Completed work sessions summed for today" icon={Clock3} accent="dark" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Weekly attendance</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Daily presence trend over the last 7 days.
            </p>
          </div>
          <Bar
            data={{
              labels: (charts.weeklyAttendance || []).map((item) => item.label),
              datasets: [
                {
                  label: "Present",
                  data: (charts.weeklyAttendance || []).map((item) => item.present),
                  borderRadius: 999,
                  backgroundColor: "rgba(79, 70, 229, 0.9)"
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false }
              },
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { precision: 0 } }
              }
            }}
          />
        </div>

        <div className="glass-panel p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Monthly trend</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Attendance sessions recorded each month.
            </p>
          </div>
          <Line
            data={{
              labels: (charts.monthlyTrend || []).map((item) => item.label),
              datasets: [
                {
                  label: "Attendance sessions",
                  data: (charts.monthlyTrend || []).map((item) => item.present),
                  tension: 0.4,
                  fill: true,
                  borderColor: "rgb(14, 165, 233)",
                  backgroundColor: "rgba(14, 165, 233, 0.12)",
                  pointBackgroundColor: "rgb(14, 165, 233)"
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false }
              },
              scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, ticks: { precision: 0 } }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
