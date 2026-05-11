import { Clock3, MoonStar, Shield, UserCog } from "lucide-react";
import { useEffect, useState } from "react";

import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { fetchCompanySettings, updateCompanySettings } from "../services/companyService";

function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [companySettings, setCompanySettings] = useState(null);
  const [formData, setFormData] = useState({
    company_name: "",
    subscription_plan: "basic",
    start_time: "09:00",
    end_time: "18:00",
    kiosk_admin_pin: ""
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      const data = await fetchCompanySettings();
      setCompanySettings(data);
      setFormData({
        company_name: data.company_name || "",
        subscription_plan: data.subscription_plan || "basic",
        start_time: data.work_schedule?.start_time || "09:00",
        end_time: data.work_schedule?.end_time || "18:00",
        kiosk_admin_pin: data.kiosk_admin_pin || ""
      });
    };

    loadSettings().catch(() => {});
  }, []);

  const expectedHours = (() => {
    const [startHour, startMinute] = formData.start_time.split(":").map(Number);
    const [endHour, endMinute] = formData.end_time.split(":").map(Number);
    if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) {
      return "0.0";
    }
    const totalHours = Math.max(0, (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60);
    return totalHours.toFixed(1);
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateCompanySettings({
        company_name: formData.company_name,
        subscription_plan: formData.subscription_plan,
        kiosk_admin_pin: formData.kiosk_admin_pin.trim() || undefined,
        work_schedule: {
          start_time: formData.start_time,
          end_time: formData.end_time,
          timezone: "Asia/Calcutta"
        }
      });
      setCompanySettings(updated);
      setMessage("Company settings updated successfully.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <div>
        <h1 className="page-heading">Settings</h1>
        <p className="page-subheading">Personalize your dashboard experience and review your current account context.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card title="Profile" subtitle={user?.email || "No email"} value={user?.name || "Admin"} icon={UserCog} />
        <Card title="Role" subtitle="Current access scope in Attendify" value={user?.role || "admin"} icon={Shield} accent="dark" />
        <Card title="Theme" subtitle="Switch between light and dark mode" value={theme} icon={MoonStar} accent="warning">
          <button type="button" onClick={toggleTheme} className="btn-secondary">
            Toggle theme
          </button>
        </Card>
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Company Work Schedule</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Set the standard working day so Attendify can calculate worked hours and overtime automatically.
            </p>
          </div>
          <Card
            title="Expected Daily Hours"
            value={`${expectedHours} hrs`}
            subtitle="Based on current start and end time"
            icon={Clock3}
            accent="success"
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</label>
            <input
              className="input"
              value={formData.company_name}
              onChange={(event) => setFormData((current) => ({ ...current, company_name: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Kiosk Admin PIN</label>
            <input
              type="password"
              className="input"
              value={formData.kiosk_admin_pin}
              placeholder="1234"
              onChange={(event) => setFormData((current) => ({ ...current, kiosk_admin_pin: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Plan</label>
            <select
              className="input"
              value={formData.subscription_plan}
              onChange={(event) => setFormData((current) => ({ ...current, subscription_plan: event.target.value }))}
            >
              <option value="basic">Basic</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Work Starts</label>
            <input
              type="time"
              className="input"
              value={formData.start_time}
              onChange={(event) => setFormData((current) => ({ ...current, start_time: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Work Ends</label>
            <input
              type="time"
              className="input"
              value={formData.end_time}
              onChange={(event) => setFormData((current) => ({ ...current, end_time: event.target.value }))}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Admin email: {companySettings?.admin_email || user?.email || "Not available"}
          </div>
          <button type="button" onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Work Schedule"}
          </button>
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default SettingsPage;
