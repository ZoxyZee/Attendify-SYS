import { createApiClient } from "./api";

export const fetchCompanySettings = async (settings) => {
  const api = createApiClient(settings);
  const response = await api.get("/company/settings");
  return response.data?.data || null;
};
