import { Camera, Save, ScanFace, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import Card from "../components/Card";
import Loader from "../components/Loader";
import Modal from "../components/Modal";
import StatPill from "../components/StatPill";
import Table from "../components/Table";
import WebcamCapture from "../components/WebcamCapture";
import { fetchEmployees, updateEmployee } from "../services/employeeService";
import { extractFaceEmbedding } from "../services/recognitionService";

const hasFaceProfile = (employee) =>
  Array.isArray(employee.face_embeddings) && employee.face_embeddings.length > 0;

function FaceRegistryPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [faceLabel, setFaceLabel] = useState("");
  const [profileNotes, setProfileNotes] = useState("");
  const [capturedImage, setCapturedImage] = useState("");
  const [captureMessage, setCaptureMessage] = useState("");
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

  const faceStats = useMemo(() => {
    const enrolled = employees.filter((employee) => hasFaceProfile(employee)).length;
    return {
      enrolled,
      pending: employees.length - enrolled
    };
  }, [employees]);

  const openModal = (employee) => {
    setSelectedEmployee(employee);
    setFaceLabel(employee.face_label || employee.employee_id);
    setCapturedImage(employee.face_image_base64 ? `data:image/jpeg;base64,${employee.face_image_base64}` : "");
    setCaptureMessage("");
    setProfileNotes(
      hasFaceProfile(employee) && employee.face_registered_at
        ? `Last updated ${new Date(employee.face_registered_at).toLocaleString()}`
        : "This employee has not been enrolled for dashboard scanning yet."
    );
    setModalOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) {
      return;
    }

    setSubmitting(true);
    try {
      if (!capturedImage) {
        throw new Error("Capture an employee photo before saving the face profile.");
      }

      setCaptureMessage("Extracting face profile...");
      const extraction = await extractFaceEmbedding(capturedImage);
      const previousEmbeddings = Array.isArray(selectedEmployee.face_embeddings)
        ? selectedEmployee.face_embeddings
        : [];
      const nextEmbeddings = [extraction.embedding, ...previousEmbeddings].slice(0, 5);

      await updateEmployee({
        employee_id: selectedEmployee.employee_id,
        face_label: faceLabel.trim(),
        face_embedding: extraction.embedding,
        face_embeddings: nextEmbeddings,
        face_image_base64: capturedImage.replace(/^data:image\/[a-zA-Z]+;base64,/, ""),
        embedding_engine: extraction.engine || "remote",
        face_registered_at: new Date().toISOString()
      });
      setModalOpen(false);
      setSelectedEmployee(null);
      setCapturedImage("");
      setCaptureMessage("");
      await loadEmployees();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Employee",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{row.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {row.employee_id} | {row.department}
          </p>
        </div>
      )
    },
    {
      key: "face_label",
      label: "Face Profile",
      render: (row) =>
        hasFaceProfile(row) ? (
          <div className="flex items-center gap-3">
            {row.face_image_base64 ? (
              <img
                src={`data:image/jpeg;base64,${row.face_image_base64}`}
                alt={row.name}
                className="h-11 w-11 rounded-2xl object-cover"
              />
            ) : null}
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{row.face_label || row.employee_id}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enrolled {row.face_registered_at ? new Date(row.face_registered_at).toLocaleDateString() : "recently"}
              </p>
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-400">Not enrolled</span>
        )
    },
    {
      key: "status",
      label: "Enrollment Status",
      render: (row) => (
        <StatPill tone={hasFaceProfile(row) ? "success" : "warning"}>
          {hasFaceProfile(row) ? "Enrolled" : "Pending"}
        </StatPill>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button type="button" onClick={() => openModal(row)} className="btn-primary gap-2 px-4 py-2">
          <ScanFace className="h-4 w-4" />
          {hasFaceProfile(row) ? "Update Face" : "Register Face"}
        </button>
      )
    }
  ];

  if (loading) {
    return <Loader label="Loading face registry" />;
  }

  return (
    <div className="page-shell">
      <div>
        <h1 className="page-heading">Face Registry</h1>
        <p className="page-subheading">
          Assign a kiosk face profile for each employee so enrolled staff can be synced to entrance devices.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <Card title="Enrolled Faces" value={faceStats.enrolled} icon={ScanFace} subtitle="Employees ready for dashboard scanning" />
        <Card title="Pending Enrollment" value={faceStats.pending} icon={Camera} accent="warning" subtitle="Employees still missing a face profile" />
        <Card
          title="Kiosk Flow"
          value="Capture + Scan"
          icon={Sparkles}
          accent="dark"
          subtitle="Register a face profile here, then scan attendance from the dashboard."
        />
      </div>

      <Table
        columns={columns}
        data={employees}
        emptyTitle="No employees available"
        emptyText="Create employees first, then enroll their face profiles here."
      />

      <Modal
        open={modalOpen}
        title={selectedEmployee ? `Register Face for ${selectedEmployee.name}` : "Register Face"}
        onClose={() => setModalOpen(false)}
        maxWidth="max-w-4xl"
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" form="face-registry-form" className="btn-primary gap-2" disabled={submitting}>
              <Save className="h-4 w-4" />
              {submitting ? "Saving..." : "Save Face Profile"}
            </button>
          </>
        }
      >
        <form id="face-registry-form" className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]" onSubmit={handleSave}>
          <WebcamCapture
            capturedImage={capturedImage}
            disabled={submitting}
            onCapture={(image) => {
              setCapturedImage(image);
              setCaptureMessage("Photo captured. Save to update this employee's face profile.");
            }}
            onError={setCaptureMessage}
          />

          <div className="space-y-4">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Capture one clear employee photo. The dashboard will extract a face profile from it and use that profile for attendance scanning.
            </div>

            {selectedEmployee && (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <span className="font-medium text-slate-900 dark:text-white">{selectedEmployee.name}</span>
                {` | ${selectedEmployee.employee_id} | ${selectedEmployee.department}`}
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{profileNotes}</div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Face Label</label>
              <input
                className="input"
                value={faceLabel}
                onChange={(event) => setFaceLabel(event.target.value)}
                placeholder="e.g. EMP001, ASHU-001, or frontdesk-ashu"
                required
              />
            </div>

            {captureMessage && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                {captureMessage}
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default FaceRegistryPage;
