import { useEffect } from "react";

import { API_BASE_URL } from "../config/api";

export const useRealtimeAttendance = (token, onUpdate, onReconnect) => {
  useEffect(() => {
    if (!token || typeof EventSource === "undefined") {
      return undefined;
    }

    const url = new URL(`${API_BASE_URL}/attendance/events`);
    url.searchParams.set("token", token);
    const source = new EventSource(url.toString());

    source.addEventListener("attendance-updated", (event) => {
      try {
        onUpdate(JSON.parse(event.data));
      } catch {
        onUpdate(null);
      }
    });
    source.onerror = onReconnect;

    return () => source.close();
  }, [token, onUpdate, onReconnect]);
};
