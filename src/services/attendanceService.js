import api from "./api";

export const fetchAttendance = async ({ filter = "today", search = "", date = "", startDate = "", endDate = "" } = {}) => {
  const response = await api.get("/attendance/today", {
    params: {
      filter,
      search,
      date,
      startDate,
      endDate
    }
  });

  return {
    data: response.data.data || [],
    meta: response.data.meta || null
  };
};

export const markWebAttendance = async ({ employee_id, timestamp = new Date().toISOString() }) => {
  const response = await api.post("/attendance/mark-web", {
    employee_id,
    device_id: "web-dashboard",
    timestamp
  });
  return response.data;
};
