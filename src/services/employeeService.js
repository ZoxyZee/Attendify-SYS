import api from "./api";

export const fetchEmployees = async () => {
  const response = await api.get("/employees/list");
  return response.data.data || [];
};

export const createEmployee = async (payload) => {
  const response = await api.post("/employees/create", payload);
  return response.data.data;
};

export const updateEmployee = async (payload) => {
  const response = await api.put("/employees/update", payload);
  return response.data.data;
};

export const deleteEmployee = async (employee_id) => {
  const response = await api.delete("/employees/delete", {
    data: { employee_id }
  });
  return response.data;
};
