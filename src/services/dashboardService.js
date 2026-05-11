import api from "./api";

export const fetchDashboardSummary = async () => {
  const response = await api.get("/attendance/summary");
  return response.data.data;
};
