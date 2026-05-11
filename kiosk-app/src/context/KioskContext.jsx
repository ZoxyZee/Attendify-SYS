import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Network from "expo-network";
import { useSQLiteContext } from "expo-sqlite";

import {
  clearEmployeeCache,
  clearKioskCompanyData,
  getLogs,
  getParsedEmployees,
  getSetting,
  saveEmployee,
  saveSetting
} from "../services/database";
import { createApiClient, isUnauthorizedError, normalizeApiError } from "../services/api";
import { fetchCompanySettings } from "../services/companyService";
import { markAttendanceRecord, registerDeviceWithBackend, syncPendingLogs } from "../services/syncService";

const KioskContext = createContext(null);

const defaultSettings = {
  apiBaseUrl: "http://192.168.29.245:5000",
  recognitionBaseUrl: "http://192.168.29.245:5000",
  authToken: "",
  deviceId: "KIOSK-01",
  deviceName: "Attendify Front Desk",
  companyId: "",
  adminEmail: "",
  adminPin: "1234"
};

const normalizeAdminPin = (value) => {
  const pin = String(value ?? "").trim();
  return pin || "1234";
};

export function KioskProvider({ children }) {
  const db = useSQLiteContext();
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const isConfigured = Boolean(settings.authToken && settings.companyId && settings.apiBaseUrl);

  const refreshData = useCallback(async () => {
    const [employeeRows, logRows] = await Promise.all([getParsedEmployees(db), getLogs(db)]);
    setEmployees(employeeRows);
    setLogs(logRows);
  }, [db]);

  const loadCompanySettings = useCallback(async (activeSettings) => {
    if (!activeSettings.apiBaseUrl || !activeSettings.authToken) {
      return null;
    }

    try {
      return await fetchCompanySettings(activeSettings);
    } catch (error) {
      return null;
    }
  }, []);

  const applyBackendAdminPin = useCallback(
    async (activeSettings, companySettings) => {
      if (!companySettings?.kiosk_admin_pin) {
        return activeSettings;
      }

      const backendPin = normalizeAdminPin(companySettings.kiosk_admin_pin);
      if (backendPin === activeSettings.adminPin) {
        return activeSettings;
      }

      const nextSettings = { ...activeSettings, adminPin: backendPin };
      setSettings(nextSettings);
      await saveSetting(db, "adminPin", backendPin);
      return nextSettings;
    },
    [db]
  );

  useEffect(() => {
    const loadInitialState = async () => {
      const loadedSettings = { ...defaultSettings };

      for (const key of Object.keys(defaultSettings)) {
        const value = await getSetting(db, key);

        if (key === "adminPin") {
          loadedSettings.adminPin = normalizeAdminPin(value);
          continue;
        }

        if (value !== null && value !== undefined) {
          loadedSettings[key] = value;
        }
      }

      setSettings(loadedSettings);
      await refreshData();

      if (loadedSettings.apiBaseUrl && loadedSettings.authToken && loadedSettings.companyId) {
        const companySettings = await loadCompanySettings(loadedSettings);
        if (companySettings) {
          await applyBackendAdminPin(loadedSettings, companySettings);
        }
      }

      setLoading(false);
    };

    loadInitialState();
  }, [db, refreshData]);

  useEffect(() => {
    const syncBackendAdminPin = async () => {
      if (!settings.apiBaseUrl || !settings.authToken || !settings.companyId) {
        return;
      }

      const companySettings = await loadCompanySettings(settings);
      if (companySettings) {
        await applyBackendAdminPin(settings, companySettings);
      }
    };

    syncBackendAdminPin().catch(() => {});
  }, [settings.apiBaseUrl, settings.authToken, settings.companyId, loadCompanySettings, applyBackendAdminPin]);

  const updateSettings = async (partialSettings) => {
    const normalizedSettings = { ...partialSettings };

    if (normalizedSettings.adminPin !== undefined) {
      normalizedSettings.adminPin = normalizeAdminPin(normalizedSettings.adminPin);
    }

    const nextSettings = { ...settings, ...normalizedSettings };
    setSettings(nextSettings);

    await Promise.all(
      Object.entries(normalizedSettings).map(([key, value]) => saveSetting(db, key, value))
    );
  };

  const expireKioskSession = useCallback(
    async (message = "Kiosk session expired. Sign in again to resume syncing and attendance.") => {
      const nextSettings = {
        ...settings,
        authToken: "",
        companyId: ""
      };

      setSettings(nextSettings);
      setSessionMessage(message);
      await Promise.all([
        saveSetting(db, "authToken", ""),
        saveSetting(db, "companyId", "")
      ]);
    },
    [db, settings]
  );

  const loginKiosk = async ({ apiBaseUrl, recognitionBaseUrl, email, password, deviceId, deviceName, adminPin }) => {
    setAuthBusy(true);
    try {
      // Preload ML models during login to avoid first-scan hangs
      console.log("Preloading ML models...");
      Promise.allSettled([
        import("../services/embeddingService").then(m => m.loadBlazeFaceModel()),
        import("../services/embeddingService").then(m => m.loadMobileFaceNetModel())
      ]).then(results => {
        results.forEach((result, i) => {
          if (result.status === 'rejected') {
            console.warn(`Model preload failed [${i}]:`, result.reason);
          }
        });
        console.log("ML models preloaded");
      });
      
      const api = createApiClient({ apiBaseUrl, authToken: "" });
      const response = await api.post("/auth/login", {
        email,
        password
      });

      const payload = response.data?.data;
      const nextCompanyId = String(payload?.company_id || "");
      const previousCompanyId = String(settings.companyId || "");

      if (!payload?.token || !nextCompanyId) {
        throw new Error("Login did not return a valid company session.");
      }

      if (previousCompanyId && previousCompanyId !== nextCompanyId) {
        await clearKioskCompanyData(db);
      }

      const authSettings = {
        apiBaseUrl,
        recognitionBaseUrl: recognitionBaseUrl || settings.recognitionBaseUrl,
        authToken: payload.token,
        companyId: nextCompanyId,
        deviceId: deviceId || settings.deviceId,
        deviceName: deviceName || settings.deviceName,
        adminEmail: email
      };

      const companySettings = await loadCompanySettings(authSettings);
      const nextSettings = {
        ...settings,
        ...authSettings,
        adminPin: normalizeAdminPin(companySettings?.kiosk_admin_pin ?? adminPin ?? settings.adminPin)
      };

      setSettings(nextSettings);
      setSessionMessage("");
      await Promise.all(Object.entries(nextSettings).map(([key, value]) => saveSetting(db, key, value)));
      await registerDeviceWithBackend(nextSettings);
      await syncEmployeesFromDashboardWithSettings(nextSettings);
      await refreshData();

      return payload;
    } catch (error) {
      throw new Error(normalizeApiError(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const logoutKiosk = async () => {
    setAuthBusy(true);
    try {
      const nextSettings = {
        ...settings,
        authToken: "",
        companyId: "",
        adminEmail: ""
      };

      setSettings(nextSettings);
      setSessionMessage("");
      await Promise.all([
        saveSetting(db, "authToken", ""),
        saveSetting(db, "companyId", ""),
        saveSetting(db, "adminEmail", "")
      ]);
      await clearKioskCompanyData(db);
      await refreshData();
    } finally {
      setAuthBusy(false);
    }
  };

  const syncEmployeesFromDashboardWithSettings = useCallback(
    async (activeSettings) => {
      if (!activeSettings.apiBaseUrl || !activeSettings.authToken) {
        return { count: 0 };
      }

      try {
        const api = createApiClient(activeSettings);
        await registerDeviceWithBackend(activeSettings);
        const response = await api.get("/employees/list");
        const remoteEmployees = response.data?.data || [];
        const localEmployees = await getParsedEmployees(db);
        const localEmployeeMap = new Map(localEmployees.map((employee) => [employee.employee_id, employee]));

        await clearEmployeeCache(db);
        await Promise.all(
          remoteEmployees.map((employee) => {
            const localEmployee = localEmployeeMap.get(employee.employee_id);
            const remoteEngine = employee.embedding_engine || null;
            const localEngine = localEmployee?.embedding_engine || null;
            const remoteEmbeddings = employee.face_embeddings?.length
              ? employee.face_embeddings.slice(0, 5)
              : employee.face_embedding
                ? [employee.face_embedding]
                : [];
            const localEmbeddings = localEmployee?.embeddings?.length ? localEmployee.embeddings.slice(0, 5) : [];
            const shouldPreferRemote =
              remoteEmbeddings.length > 0 &&
              (
                !localEmbeddings.length ||
                (remoteEngine && localEngine && remoteEngine !== localEngine) ||
                remoteEmbeddings.length >= localEmbeddings.length
              );
            const embeddings = shouldPreferRemote ? remoteEmbeddings : localEmbeddings;
            const primaryEmbedding = shouldPreferRemote
              ? employee.face_embedding || embeddings[0] || localEmployee?.face_embedding || null
              : localEmployee?.face_embedding || embeddings[0] || employee.face_embedding || null;

            return saveEmployee(db, {
              employee_id: employee.employee_id,
              name: employee.name,
              department: employee.department,
              face_label: employee.face_label || employee.employee_id,
              embeddings,
              embedding_engine: shouldPreferRemote ? remoteEngine || localEngine || null : localEngine || remoteEngine || null,
              face_embedding: primaryEmbedding,
              embedding_updated_at: employee.face_registered_at || localEmployee?.embedding_updated_at || null
            });
          })
        );

        return {
          count: remoteEmployees.length
        };
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await expireKioskSession("Kiosk session expired while loading employees. Sign in again.");
        }

        throw error;
      }
    },
    [db, expireKioskSession]
  );

  const syncNow = useCallback(async () => {
    if (syncing) {
      return { syncedCount: 0 };
    }

    setSyncing(true);
    try {
      let activeSettings = settings;
      const companySettings = await loadCompanySettings(settings);
      if (companySettings) {
        activeSettings = await applyBackendAdminPin(settings, companySettings);
      }

      const [result] = await Promise.all([syncPendingLogs(db, activeSettings), syncEmployeesFromDashboardWithSettings(activeSettings)]);
      await refreshData();
      return result;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await expireKioskSession("Kiosk session expired during sync. Sign in again to continue.");
      }

      throw error;
    } finally {
      setSyncing(false);
    }
  }, [db, expireKioskSession, refreshData, settings, syncing, syncEmployeesFromDashboardWithSettings]);

  const registerDevice = useCallback(async () => {
    try {
      const device = await registerDeviceWithBackend(settings);
      return device;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await expireKioskSession("Kiosk session expired while registering this device. Sign in again.");
      }

      throw error;
    }
  }, [expireKioskSession, settings]);

  useEffect(() => {
    const subscription = Network.addNetworkStateListener(async (state) => {
      if (state.isConnected) {
        await syncNow();
      }
    });

    return () => subscription.remove();
  }, [syncNow]);

  useEffect(() => {
    const interval = setInterval(() => {
      syncNow().catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, [syncNow]);

  const registerEmployee = async (employee) => {
    if (settings.apiBaseUrl && settings.authToken) {
      try {
        await registerDeviceWithBackend(settings);
        const api = createApiClient(settings);
        await api.post("/employees/create", {
          employee_id: employee.employee_id,
          name: employee.name,
          department: employee.department || "General",
          face_label: employee.face_label || employee.employee_id,
          face_embedding: employee.face_embedding || [],
          face_embeddings: employee.embeddings || [],
          embedding_engine: employee.embedding_engine || null,
          face_registered_at: employee.embedding_updated_at || new Date().toISOString(),
          status: "active"
        });
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await expireKioskSession("Kiosk session expired while saving the employee. Sign in again.");
          throw new Error("Kiosk session expired. Sign in again before registering employees.");
        }

        console.warn("Unable to register employee with backend:", error.message);
      }
    }

    await saveEmployee(db, employee);
    await refreshData();
  };

  const importEmployeesFromServer = async () => {
    if (!settings.apiBaseUrl || !settings.authToken) {
      throw new Error("Configure API Base URL and JWT token before importing employees.");
    }
    const result = await syncEmployeesFromDashboardWithSettings(settings);
    await refreshData();
    return result;
  };

  const markAttendance = async (recognition) => {
    try {
      const result = await markAttendanceRecord(db, settings, recognition);
      await refreshData();
      return result;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await expireKioskSession("Kiosk session expired while marking attendance. Sign in again.");
      }

      throw error;
    }
  };

  return (
    <KioskContext.Provider
      value={{
        employees,
        logs,
        settings,
        loading,
        authBusy,
        syncing,
        isConfigured,
        sessionMessage,
        updateSettings,
        loginKiosk,
        logoutKiosk,
        registerEmployee,
        markAttendance,
        syncNow,
        registerDevice,
        importEmployeesFromServer,
        refreshData
      }}
    >
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk() {
  return useContext(KioskContext);
}
