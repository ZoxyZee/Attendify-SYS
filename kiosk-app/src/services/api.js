import axios from "axios";

export const createHttpClient = ({ baseURL, authToken, timeout = 10000 }) => {
  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      "Content-Type": "application/json"
    }
  });

  client.interceptors.request.use((config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  });

  return client;
};

const normalizeBaseUrl = (value = "") => value.trim().replace(/\/+$/, "");

const normalizeRecognitionBaseUrl = (settings = {}) => {
  const baseUrl = normalizeBaseUrl(settings.recognitionBaseUrl || settings.apiBaseUrl || "");

  if (!baseUrl) {
    return baseUrl;
  }

  return /\/recognition$/i.test(baseUrl) ? baseUrl : `${baseUrl}/recognition`;
};

export const createApiClient = (settings) =>
  createHttpClient({
    baseURL: settings.apiBaseUrl,
    authToken: settings.authToken
  });

export const createRecognitionClient = (settings, timeout = 30000) =>
  createHttpClient({
    baseURL: normalizeRecognitionBaseUrl(settings),
    authToken: settings.authToken,
    timeout
  });

export const normalizeApiError = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (typeof error.response?.data?.detail === "string") {
    return error.response.data.detail;
  }

  if (error.message === "Network Error") {
    return "Network Error. Make sure the phone and backend are on the same Wi-Fi, the API URL is correct, and the backend is reachable.";
  }

  return error.message || "Something went wrong while connecting to the backend.";
};

export const isUnauthorizedError = (error) => error?.response?.status === 401;
