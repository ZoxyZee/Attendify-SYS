import { useEffect } from "react";

export const useLiveRefresh = (callback, dependencies = [], intervalMs = 2000) => {
  useEffect(() => {
    let cancelled = false;
    let busy = false;

    const refresh = async () => {
      if (cancelled || busy || document.visibilityState !== "visible") {
        return;
      }

      busy = true;
      try {
        await callback();
      } finally {
        busy = false;
      }
    };

    const interval = setInterval(refresh, intervalMs);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, dependencies);
};
