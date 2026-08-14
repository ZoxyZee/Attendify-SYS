import { API_BASE_URL } from "../config/api";

const normalizeMessage = async (response) => {
  try {
    const body = await response.json();
    return body?.message || body?.detail || `Request failed with ${response.status}`;
  } catch {
    return `Request failed with ${response.status}`;
  }
};

export const request = async (path, { token, ...options } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(await normalizeMessage(response));
  }

  return response.json();
};

export const loginUser = async (credentials) => {
  const body = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
  const token = body.data?.token || body.access_token || body.token;

  if (!token) {
    throw new Error("Login response did not include a token.");
  }

  return { token, user: body.data?.user || body.user || null };
};

export const fetchEmployees = (token) => request("/employees/list", { token });

export const markWebAttendance = (token, payload) =>
  request("/attendance/mark-web", {
    token,
    method: "POST",
    body: JSON.stringify(payload)
  });
