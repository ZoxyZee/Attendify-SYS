import { getPendingLogs, updateAttendanceLog } from "./database";
import { assertAttendanceAllowed, queueAttendanceRecord } from "./attendanceService";
import { createApiClient, isUnauthorizedError } from "./api";
import { normalizeBackendUrl } from "./backendUrl";

const normalizeNetworkSettings = (settings) => ({
  ...settings,
  apiBaseUrl: normalizeBackendUrl(settings.apiBaseUrl || ""),
  recognitionBaseUrl: normalizeBackendUrl(settings.recognitionBaseUrl || settings.apiBaseUrl || "")
});

export const registerDeviceWithBackend = async (settings) => {
  const activeSettings = normalizeNetworkSettings(settings);
  if (!activeSettings.apiBaseUrl || !activeSettings.authToken || !activeSettings.deviceId || !activeSettings.deviceName) {
    return null;
  }

  const api = createApiClient(activeSettings);
  const response = await api.post("/devices/register", {
    device_id: activeSettings.deviceId,
    device_name: activeSettings.deviceName
  });

  return response.data?.data || null;
};

const shouldQueueOfflineError = (error) => {
  if (isUnauthorizedError(error)) {
    return true;
  }

  const status = error?.response?.status;
  if (!status) {
    return true;
  }

  return status >= 500;
};

export const markAttendanceRecord = async (db, settings, recognition) => {
  const activeSettings = normalizeNetworkSettings(settings);
  const timestamp = new Date().toISOString();
  const basePayload = {
    employee_id: recognition.employee_id,
    employee_name: recognition.employee_name,
    device_id: activeSettings.deviceId,
    timestamp,
    image_uri: recognition.image_uri || ""
  };

  await assertAttendanceAllowed(db, basePayload);

  if (!activeSettings.apiBaseUrl || !activeSettings.authToken) {
    const id = await queueAttendanceRecord(db, {
      ...basePayload,
      synced: false,
      response_message: "Saved locally. Add API settings in admin mode to sync."
    });

    return {
      offline: true,
      logId: id,
      employee_name: recognition.employee_name
    };
  }

  try {
    const api = createApiClient(activeSettings);
    let response;
    try {
      response = await api.post("/attendance/mark", {
        employee_id: recognition.employee_id,
        device_id: activeSettings.deviceId,
        device_name: activeSettings.deviceName,
        timestamp
      });
    } catch (markError) {
      const message = String(markError.response?.data?.message || markError.response?.data?.detail || "");
      if (markError.response?.status !== 400 || !message.toLowerCase().includes("device")) {
        throw markError;
      }

      await registerDeviceWithBackend(activeSettings);
      response = await api.post("/attendance/mark", {
        employee_id: recognition.employee_id,
        device_id: activeSettings.deviceId,
        device_name: activeSettings.deviceName,
        timestamp
      });
    }

    const id = await queueAttendanceRecord(db, {
      ...basePayload,
      synced: true,
      response_message: response.data?.message || "Attendance recorded"
    });

    return {
      offline: false,
      logId: id,
      employee_name: recognition.employee_name,
      message: response.data?.message || "Attendance recorded"
    };
  } catch (error) {
    if (!shouldQueueOfflineError(error)) {
      throw error;
    }

    const id = await queueAttendanceRecord(db, {
      ...basePayload,
      synced: false,
      response_message: isUnauthorizedError(error)
        ? "Kiosk session expired. Sign in again to sync this record."
        : error.response?.data?.message || error.message || "Saved offline after API failure."
    });

    if (isUnauthorizedError(error)) {
      error.offlineLogId = id;
      throw error;
    }

    return {
      offline: true,
      logId: id,
      employee_name: recognition.employee_name,
      message: error.response?.data?.message || error.message
    };
  }
};

export const syncPendingLogs = async (db, settings) => {
  const activeSettings = normalizeNetworkSettings(settings);
  if (!activeSettings.apiBaseUrl || !activeSettings.authToken) {
    return { syncedCount: 0, message: "API settings are incomplete." };
  }

  await registerDeviceWithBackend(activeSettings);

  const pendingLogs = await getPendingLogs(db);

  if (!pendingLogs.length) {
    return { syncedCount: 0, message: "No pending attendance logs." };
  }

  const api = createApiClient(activeSettings);
  const records = pendingLogs.map((log) => ({
    employee_id: log.employee_id,
    device_id: log.device_id,
    timestamp: log.timestamp
  }));

  const response = await api.post("/attendance/sync", { records });
  const results = response.data?.data || [];

  await Promise.all(
    pendingLogs.map((log, index) =>
      updateAttendanceLog(db, log.id, {
        status: results[index]?.success ? "recorded" : "queued",
        synced: Boolean(results[index]?.success),
        response_message: results[index]?.message || "Synced",
        employee_id: log.employee_id,
        timestamp: log.timestamp,
        device_id: log.device_id
      })
    )
  );

  return {
    syncedCount: results.filter((item) => item.success).length,
    message: response.data?.message || "Sync complete"
  };
};
