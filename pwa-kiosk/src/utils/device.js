import { DEVICE_KEY } from "../config/storage";

export const getDeviceId = () => {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const next = `pwa-kiosk-${crypto.randomUUID?.() || Date.now()}`;
  localStorage.setItem(DEVICE_KEY, next);
  return next;
};
