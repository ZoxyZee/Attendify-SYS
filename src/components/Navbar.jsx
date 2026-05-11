import { Bell, LogOut, Menu, MoonStar, Search, SunMedium } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

function Navbar({ onOpenSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between rounded-[28px] border border-white/50 bg-white/70 px-4 py-4 shadow-soft backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/70 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-2xl border border-slate-200 p-2 text-slate-600 dark:border-slate-800 dark:text-slate-300 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900 md:flex">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="w-56 bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="Search attendance, employees..."
            readOnly
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </button>

        <button
          type="button"
          className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 sm:block">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{user?.name || "Admin User"}</p>
          <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{user?.role || "admin"}</p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 transition hover:-translate-y-0.5 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export default Navbar;
