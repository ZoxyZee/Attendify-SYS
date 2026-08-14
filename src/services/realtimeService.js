import { TOKEN_KEY } from "../context/AuthContext";
import { API_BASE_URL } from "./api";

export const subscribeAttendanceUpdates = (onUpdate) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || typeof EventSource === "undefined") {
    return () => {};
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

  return () => source.close();
};
