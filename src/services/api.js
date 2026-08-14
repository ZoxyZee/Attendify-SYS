import axios from "axios";

import { TOKEN_KEY } from "../context/AuthContext";

const resolveApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL;
  const currentHost = window.location.hostname;
  const isCurrentHostLoopback = ["localhost", "127.0.0.1", "::1"].includes(currentHost);

  if (configuredUrl) {
    try {
      const parsedUrl = new URL(configuredUrl);
      const isConfiguredLoopback = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);

      if (isConfiguredLoopback && !isCurrentHostLoopback) {
        parsedUrl.hostname = currentHost;
        return parsedUrl.toString().replace(/\/$/, "");
      }
    } catch {
      return configuredUrl;
    }

    return configuredUrl;
  }

  return `${window.location.protocol}//${currentHost}:5000`;
};

export const API_BASE_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

const formatValidationLocation = (location = []) =>
  location
    .filter((item) => item !== "body")
    .map((item) => String(item).replace(/_/g, " "))
    .join(" ");

const normalizeErrorMessage = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        const location = formatValidationLocation(item.loc);
        const message = item.msg || item.message || "Invalid value";
        return location ? `${location}: ${message}` : message;
      })
      .join(" ");
  }

  if (typeof value === "object") {
    return value.message || value.msg || JSON.stringify(value);
  }

  return String(value);
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      normalizeErrorMessage(error.response?.data?.detail) ||
      normalizeErrorMessage(error.response?.data?.message) ||
      error.message ||
      "Something went wrong. Please try again.";

    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("attendify_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
