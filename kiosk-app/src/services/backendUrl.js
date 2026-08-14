import Constants from "expo-constants";

const fallbackBackendUrl = "http://192.168.29.215:5000";
const staleBackendUrls = new Set([
  "http://192.168.29.245:5000",
  "http://10.176.39.211:5000",
  "http://10.32.126.211:5000"
]);

const normalizeUrl = (value = "") => String(value).trim().replace(/\/+$/, "");

const isLoopbackBackendUrl = (value) => {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname;
    return (
      parsed.port === "5000" &&
      (host === "localhost" || host === "127.0.0.1" || host === "::1")
    );
  } catch {
    return false;
  }
};

const getExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    "";

  return String(hostUri).split(":")[0];
};

export const getDefaultBackendUrl = () => {
  const host = getExpoHost();
  return host ? `http://${host}:5000` : fallbackBackendUrl;
};

export const normalizeBackendUrl = (value) => {
  const url = normalizeUrl(value);
  const defaultUrl = getDefaultBackendUrl();

  try {
    const parsed = new URL(url);
    const expoHost = getExpoHost();
    if (expoHost && parsed.port === "5000" && parsed.hostname !== expoHost) {
      return defaultUrl;
    }
  } catch {
    return defaultUrl;
  }

  return staleBackendUrls.has(url) || isLoopbackBackendUrl(url) ? defaultUrl : url;
};
