import { MonitorSmartphone, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import Loader from "../components/Loader";
import Modal from "../components/Modal";
import Table from "../components/Table";
import { fetchDevices, registerDevice } from "../services/deviceService";

function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ device_name: "", device_id: "" });
  const [submitting, setSubmitting] = useState(false);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await fetchDevices();
      setDevices(data);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await registerDevice(formData);
      setModalOpen(false);
      setFormData({ device_name: "", device_id: "" });
      await loadDevices();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "device_name",
      label: "Device Name",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-primary dark:bg-indigo-950/50">
            <MonitorSmartphone className="h-4 w-4" />
          </div>
          <span className="font-medium text-slate-900 dark:text-white">{row.device_name}</span>
        </div>
      )
    },
    { key: "device_id", label: "Device ID" },
    {
      key: "last_active",
      label: "Last Active",
      render: (row) => new Date(row.last_active).toLocaleString()
    }
  ];

  if (loading) {
    return <Loader label="Loading devices" />;
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="page-heading">Devices</h1>
          <p className="page-subheading">Monitor kiosk devices deployed at entry points and office gates.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary gap-2">
          <Plus className="h-4 w-4" />
          Register Device
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <Table
        columns={columns}
        data={devices}
        emptyTitle="No devices registered"
        emptyText="Register a kiosk device to start recording attendance."
      />

      <Modal
        open={modalOpen}
        title="Register device"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="device-form" className="btn-primary">
              {submitting ? "Saving..." : "Register"}
            </button>
          </>
        }
      >
        <form id="device-form" className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Device Name</label>
            <input
              className="input"
              value={formData.device_name}
              onChange={(event) => setFormData((current) => ({ ...current, device_name: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Device ID</label>
            <input
              className="input"
              value={formData.device_id}
              onChange={(event) => setFormData((current) => ({ ...current, device_id: event.target.value }))}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default DevicesPage;
