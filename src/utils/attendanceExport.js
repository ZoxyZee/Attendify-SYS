import { APP_TIME_ZONE, formatIstDate } from "./time";

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const formatDateValue = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `'${formatIstDate(date)}`;
};

const formatTimeValue = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `'${date.toLocaleTimeString([], {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  })}`;
};

export const downloadAttendanceCsv = ({ rows, filename = "attendance-export.csv" }) => {
  const headers = [
    "Employee Name",
    "Employee ID",
    "Date",
    "Check-in",
    "Check-out",
    "Status",
    "Sessions",
    "Worked Hours",
    "Overtime Hours"
  ];

  const csvRows = rows.map((row) => [
    row.employee_name,
    row.employee_id,
    formatDateValue(row.date),
    formatTimeValue(row.check_in),
    formatTimeValue(row.check_out),
    row.status,
    row.session_count || 0,
    row.worked_hours || 0,
    row.overtime_hours || 0
  ]);

  const csvContent = [headers, ...csvRows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
