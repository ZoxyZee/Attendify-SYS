import { CheckCircle2, Search } from "lucide-react";

export function EmployeePicker({ employees, query, selectedId, onQueryChange, onSelect }) {
  return (
    <>
      <label className="search-box">
        <Search size={18} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search employee" />
      </label>

      <div className="employee-list">
        {employees.map((employee) => (
          <button
            className={employee.employee_id === selectedId ? "employee selected" : "employee"}
            type="button"
            key={employee.employee_id}
            onClick={() => onSelect(employee.employee_id)}
          >
            <span>
              <strong>{employee.name || employee.employee_id}</strong>
              <small>{employee.employee_id}</small>
            </span>
            {employee.employee_id === selectedId && <CheckCircle2 size={22} />}
          </button>
        ))}
      </div>
    </>
  );
}
