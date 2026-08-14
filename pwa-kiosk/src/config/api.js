export const resolveApiBaseUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const queryUrl = params.get("api");
  if (queryUrl) {
    localStorage.setItem("attendify_pwa_kiosk_api_url", queryUrl.replace(/\/$/, ""));
  }

  const storedUrl = localStorage.getItem("attendify_pwa_kiosk_api_url");
  if (storedUrl) {
    return storedUrl.replace(/\/$/, "");
  }

  const configured = import.meta.env.VITE_API_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `${window.location.protocol}//${window.location.hostname}:5000`;
};

export const API_BASE_URL = resolveApiBaseUrl();
