import { Navigate, Route, Routes } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AttendancePage from "./pages/Attendance";
import DashboardPage from "./pages/Dashboard";
import DevicesPage from "./pages/Devices";
import EmployeesPage from "./pages/Employees";
import FaceRegistryPage from "./pages/FaceRegistry";
import LoginPage from "./pages/Login";
import ReportsPage from "./pages/Reports";
import SettingsPage from "./pages/Settings";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="faces" element={<FaceRegistryPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
