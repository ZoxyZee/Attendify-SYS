import { Pencil, Plus, ScanFace, Trash2, UserMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Loader from "../components/Loader";
import Modal from "../components/Modal";
import StatPill from "../components/StatPill";
import Table from "../components/Table";
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee
} from "../services/employeeService";

const defaultForm = {
  name: "",
  employee_id: "",
  department: ""
};

function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await fetchEmployees();
      setEmployees(data);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData(defaultForm);
    setModalOpen(true);
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      employee_id: employee.employee_id,
      department: employee.department
    });
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (editingEmployee) {
        await updateEmployee({
          employee_id: editingEmployee.employee_id,
          name: formData.name,
          department: formData.department
        });
      } else {
        await createEmployee({
          ...formData,
          status: "active"
        });
      }

      setModalOpen(false);
      setFormData(defaultForm);
      await loadEmployees();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (employee) => {
    try {
      await updateEmployee({
        employee_id: employee.employee_id,
        status: "inactive"
      });
      await loadEmployees();
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  const handleDelete = async (employee) => {
    try {
      await deleteEmployee(employee.employee_id);
      await loadEmployees();
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Employee Name",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{row.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{row.department}</p>
        </div>
      )
    },
    { key: "employee_id", label: "Employee ID" },
    { key: "department", label: "Department" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatPill tone={row.status === "active" ? "success" : "warning"}>{row.status}</StatPill>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => openEditModal(row)} className="btn-secondary px-3 py-2">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => handleDeactivate(row)} className="btn-secondary px-3 py-2">
            <UserMinus className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => navigate("/faces")} className="btn-secondary px-3 py-2">
            <ScanFace className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="inline-flex items-center justify-center rounded-2xl border border-rose-200 px-3 py-2 text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return <Loader label="Loading employees" />;
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="page-heading">Employees</h1>
          <p className="page-subheading">Manage employees enrolled in face recognition attendance.</p>
        </div>

        <button type="button" onClick={openCreateModal} className="btn-primary gap-2">
          <Plus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <Table
        columns={columns}
        data={employees}
        emptyTitle="No employees yet"
        emptyText="Add your first employee to start tracking attendance."
      />

      <Modal
        open={modalOpen}
        title={editingEmployee ? "Edit employee" : "Add employee"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="employee-form" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save Employee"}
            </button>
          </>
        }
      >
        <form id="employee-form" className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
            <input
              className="input"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Employee ID</label>
            <input
              className="input"
              value={formData.employee_id}
              disabled={Boolean(editingEmployee)}
              onChange={(event) => setFormData((current) => ({ ...current, employee_id: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
            <input
              className="input"
              value={formData.department}
              onChange={(event) => setFormData((current) => ({ ...current, department: event.target.value }))}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default EmployeesPage;
