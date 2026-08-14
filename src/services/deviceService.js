import api from "./api";

export const fetchDevices = async () => {
  const response = await api.get("/devices/list");
  return response.data.data || [];
};

export const registerDevice = async (payload) => {
  const response = await api.post("/devices/register", payload);
  return response.data.data;
};

export const removeDevice = async (deviceId) => {
  const response = await api.delete(`/devices/${encodeURIComponent(deviceId)}`);
  return response.data;
};
