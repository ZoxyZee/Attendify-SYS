import {
  BarChart3,
  Cog,
  CreditCard,
  LayoutDashboard,
  MonitorSmartphone,
  Smartphone,
  ScanFace,
  Users
} from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", to: "/employees", icon: Users },
  { label: "Face Registry", to: "/faces", icon: ScanFace },
  { label: "Attendance", to: "/attendance", icon: CreditCard },
  { label: "PWA Kiosk", to: "/kiosk", icon: Smartphone },
  { label: "Devices", to: "/devices", icon: MonitorSmartphone },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Settings", to: "/settings", icon: Cog }
];

function Sidebar({ mobile = false }) {
  return (
    <aside
      className={`${
        mobile
          ? "w-full border-none bg-transparent px-0 py-0"
          : "fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/40 bg-white/70 px-6 py-8 backdrop-blur-2xl dark:border-white/5 dark:bg-slate-950/70 lg:block"
      }`}
    >
      <div className="flex items-center gap-3 px-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-sky-500 text-lg font-bold text-white shadow-float">
          A
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Attendify</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Attendance intelligence</p>
        </div>
      </div>

      <nav className="mt-10 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-soft dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="glass-panel mt-10 overflow-hidden p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pro insight</p>
        <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
          Reduce missed check-ins with live kiosk health tracking.
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Keep entry devices monitored and employee attendance flows consistent.
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
