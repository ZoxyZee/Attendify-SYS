import api from "./api";

export const fetchCompanySettings = async () => {
  const response = await api.get("/company/settings");
  return response.data.data;
};

export const updateCompanySettings = async (payload) => {
  const response = await api.put("/company/settings", payload);
  return response.data.data;
};
