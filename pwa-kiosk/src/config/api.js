export const resolveApiBaseUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const queryUrl = params.get("api");
  if (queryUrl) {
    localStorage.setItem("attendify_pwa_kiosk_api_url", queryUrl.replace(/\/$/, ""));
  }

  const isLocalHost =
    window.location.protocol === "http:" &&
    /^(localhost|127\.0\.0\.1|10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(window.location.hostname);
  const storedUrl = localStorage.getItem("attendify_pwa_kiosk_api_url");
  if (storedUrl && !queryUrl && isLocalHost) {
    localStorage.removeItem("attendify_pwa_kiosk_api_url");
  } else if (storedUrl) {
    return storedUrl.replace(/\/$/, "");
  }

  const configured = import.meta.env.VITE_API_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `${window.location.protocol}//${window.location.hostname}:5000`;
};

export const API_BASE_URL = resolveApiBaseUrl();
