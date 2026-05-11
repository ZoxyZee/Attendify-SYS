import { X } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar />

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div
            className="h-full w-72 bg-white/95 p-6 backdrop-blur-xl dark:bg-slate-950/95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                className="rounded-2xl border border-slate-200 p-2 dark:border-slate-800"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Sidebar mobile />
          </div>
        </div>
      )}

      <main className="min-h-screen lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <Navbar onOpenSidebar={() => setSidebarOpen(true)} />
          <div className="mt-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
