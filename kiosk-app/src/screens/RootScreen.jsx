import { MaterialIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AdminPanel from "../components/AdminPanel";
import EnrollmentCaptureOverlay from "../components/EnrollmentCaptureOverlay";
import KioskCamera from "../components/KioskCamera";
import KioskSetupScreen from "../components/KioskSetupScreen";
import PinUnlockModal from "../components/PinUnlockModal";
import SuccessOverlay from "../components/SuccessOverlay";
import { useKiosk } from "../context/KioskContext";
import { useScanner } from "../hooks/useScanner";
import { averageEmbeddings, extractFaceEmbedding } from "../services/recognitionService";

function RootScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraInstanceKey, setCameraInstanceKey] = useState(0);
  const [adminVisible, setAdminVisible] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [registrationSamples, setRegistrationSamples] = useState([]);
  const [enrollmentSession, setEnrollmentSession] = useState(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [successState, setSuccessState] = useState({
    visible: false,
    employeeName: "",
    offline: false
  });

  const {
    employees,
    logs,
    settings,
    loading,
    authBusy,
    syncing,
    isConfigured,
    sessionMessage,
    loginKiosk,
    logoutKiosk,
    registerEmployee,
    updateSettings,
    markAttendance,
    syncNow,
    registerDevice,
    importEmployeesFromServer
  } = useKiosk();

  const showSuccess = ({ employee_name, offline }) => {
    setSuccessState({
      visible: true,
      employeeName: employee_name,
      offline
    });

    setTimeout(() => {
      setSuccessState({
        visible: false,
        employeeName: "",
        offline: false
      });
    }, 1200);
  };

  const { isProcessing, faceDetected, scanHint, lastDiagnostic, runScan, isSessionActive, secondsRemaining } = useScanner({
    cameraRef,
    cameraReady,
    employees,
    settings,
    enabled: isConfigured && !adminVisible && !pinVisible && !successState.visible && !enrollmentSession,
    onCaptureStuck: () => {
      cameraRef.current = null;
      setCameraReady(false);
      setCameraInstanceKey((current) => current + 1);
    },
    onRecognized: async (recognition) => {
      try {
        const result = await markAttendance(recognition);
        showSuccess(result);
      } catch (error) {
        Alert.alert("Attendance paused", error.message || "Sign in again to continue scanning.");
      }
    }
  });

  const startEnrollment = async (employeeForm) => {
    if (!employeeForm.employee_id || !employeeForm.name) {
      Alert.alert("Incomplete form", "Enter employee name and employee ID before opening capture.");
      return;
    }

    setCaptureError("");
    setAdminVisible(false);
    setEnrollmentSession({
      employeeForm: {
        ...employeeForm,
        face_label: employeeForm.face_label || employeeForm.employee_id
      }
    });
  };

  const captureRegistrationSample = async () => {
    if (!cameraRef.current || !enrollmentSession?.employeeForm) {
      setCaptureError("Open the capture camera again before taking a sample.");
      return;
    }

    try {
      setCaptureBusy(true);
      setCaptureError("");

      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        exif: false
      });

      if (!photo?.base64) {
        throw new Error("Camera did not return image data. Tap capture again.");
      }

      const { embedding, engine } = await extractFaceEmbedding({ base64: photo.base64, settings });
      setRegistrationSamples((current) =>
        [...current, { embedding, engine, uri: photo.uri || `capture-${Date.now()}` }].slice(0, 5)
      );
    } catch (error) {
      setCaptureError(error.message);
    } finally {
      setCaptureBusy(false);
    }
  };

  const closeEnrollment = () => {
    setEnrollmentSession(null);
    setRegistrationSamples([]);
    setCaptureBusy(false);
    setCaptureError("");
    setAdminVisible(true);
  };

  const registerEmployeeWithEmbedding = async () => {
    const employeeForm = enrollmentSession?.employeeForm;

    if (!employeeForm) {
      Alert.alert("Enrollment closed", "Open capture again to finish registering this employee.");
      return;
    }

    if (registrationSamples.length < 5) {
      Alert.alert("More samples needed", "Capture 5 face samples before saving the employee.");
      return;
    }

    const embeddings = registrationSamples.slice(0, 5).map((sample) => sample.embedding);
    const face_embedding = averageEmbeddings(embeddings);
    const embedding_engine = registrationSamples[0]?.engine || null;

    await registerEmployee({
      ...employeeForm,
      face_label: employeeForm.face_label || employeeForm.employee_id,
      embeddings,
      face_embedding,
      embedding_engine,
      embedding_updated_at: new Date().toISOString()
    });

    const employeeName = employeeForm.name;
    setEnrollmentSession(null);
    setRegistrationSamples([]);
    setCaptureError("");
    setAdminVisible(true);
    Alert.alert("Employee saved", `${employeeName} is ready for recognition.`);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <Text className="text-lg font-semibold text-white">Preparing kiosk...</Text>
      </View>
    );
  }

  if (!isConfigured) {
    return (
      <KioskSetupScreen
        initialSettings={settings}
        loading={authBusy}
        sessionMessage={sessionMessage}
        onLogin={async (credentials) => {
          await loginKiosk(credentials);
          Alert.alert("Kiosk ready", "Company session started. Employees will sync to this device.");
        }}
      />
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <KioskCamera
        key={cameraInstanceKey}
        cameraRef={cameraRef}
        onReady={() => setCameraReady(true)}
      >
        <Pressable
          className="flex-1 justify-between bg-[rgba(2,6,23,0.38)] px-6"
          style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}
          onLongPress={() => setPinVisible(true)}
          delayLongPress={3000}
        >
          <View className="flex-row items-start justify-between">
            <View className="max-w-[12.5rem] rounded-[26px] border border-white/10 bg-slate-950/55 px-4 py-3 backdrop-blur-xl">
              <Text className="text-[11px] font-semibold uppercase tracking-[2.4px] text-sky-200/90">Attendify Kiosk</Text>
              <Text className="mt-1 text-base font-semibold text-white">{settings.deviceName || "Front Desk Scanner"}</Text>
            </View>

            <View className="rounded-[24px] border border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur-xl">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.8px] text-slate-300">Recognition</Text>
              <Text className={`mt-1 text-sm font-semibold ${faceDetected ? "text-emerald-300" : "text-white"}`}>
                {!cameraReady ? "Resetting" : faceDetected ? "Face locked" : isProcessing ? "Processing" : "Ready"}
              </Text>
            </View>
          </View>

          <View className="items-center">
            <View
              className={`h-80 w-[19rem] items-center justify-center rounded-[9rem] border-4 ${
                faceDetected ? "border-emerald-400 shadow-[0_0_90px_rgba(52,211,153,0.28)]" : "border-white/25"
              } bg-white/5`}
            >
              <View className="absolute h-[22rem] w-[21rem] rounded-[11rem] border border-white/10" />
              <View className="absolute h-[19.5rem] w-[18.5rem] rounded-[10rem] border border-white/10" />
              <View className="absolute h-[16rem] w-[15rem] rounded-[8rem] border border-sky-300/15 bg-sky-400/5" />
              <View className="h-[15.25rem] w-[12rem] rounded-[6.5rem] border border-dashed border-white/45" />
              <View className="absolute h-3 w-3 rounded-full bg-white/75" style={{ top: 42 }} />
              <View className="absolute h-3 w-3 rounded-full bg-white/75" style={{ bottom: 42 }} />
              <View className="absolute left-[3.85rem] top-[6.4rem] h-8 w-8 rounded-tl-3xl border-l-[3px] border-t-[3px] border-white/65" />
              <View className="absolute right-[3.85rem] top-[6.4rem] h-8 w-8 rounded-tr-3xl border-r-[3px] border-t-[3px] border-white/65" />
              <View className="absolute bottom-[6.4rem] left-[3.85rem] h-8 w-8 rounded-bl-3xl border-b-[3px] border-l-[3px] border-white/65" />
              <View className="absolute bottom-[6.4rem] right-[3.85rem] h-8 w-8 rounded-br-3xl border-b-[3px] border-r-[3px] border-white/65" />
              {isProcessing ? (
                <View className="absolute items-center">
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text className="mt-3 text-sm font-medium uppercase tracking-[1.8px] text-white">Scanning...</Text>
                </View>
              ) : null}
            </View>

            <View className="mt-6 rounded-full border border-white/10 bg-slate-950/40 px-4 py-2">
              <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-white/80">
                Oval face alignment guide
              </Text>
            </View>
            <Text className="mt-6 text-center text-[2.7rem] font-bold leading-[3.1rem] text-white">
              Scan Face to Mark{"\n"}Attendance
            </Text>
            <Text className="mt-3 max-w-[19rem] text-center text-base leading-6 text-slate-200">{scanHint}</Text>
            <View className="mt-4 max-w-[20rem] rounded-[20px] border border-white/10 bg-slate-950/45 px-4 py-3">
              <Text className="text-[11px] font-semibold uppercase tracking-[1.8px] text-slate-400">Live diagnostic</Text>
              <Text className="mt-1 text-center text-sm leading-5 text-white">{lastDiagnostic}</Text>
            </View>
            <View className="mt-6 flex-row gap-3">
              <View className="rounded-[22px] border border-white/10 bg-slate-950/45 px-4 py-3">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-400">Window</Text>
                <Text className="mt-1 text-sm font-semibold text-white">{isSessionActive ? "Capturing" : "Ready"}</Text>
              </View>
              <View className="rounded-[22px] border border-white/10 bg-slate-950/45 px-4 py-3">
                <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-slate-400">Employees</Text>
                <Text className="mt-1 text-sm font-semibold text-white">{employees.length}</Text>
              </View>
            </View>
          </View>

          <View className="rounded-[34px] border border-white/10 bg-slate-950/62 px-5 py-5 backdrop-blur-xl">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-slate-400">Device</Text>
                <Text className="mt-1 text-base font-semibold text-white">{settings.deviceName || "Attendify Kiosk"}</Text>
                <Text className="mt-1 text-sm text-slate-300">
                  {isSessionActive
                    ? "Recognition is live. Hold still while the system confirms your identity."
                    : "Tap the scanner to start a guided 15 second recognition window."}
                </Text>
              </View>
              <TouchableOpacity
                onPress={runScan}
                disabled={isProcessing || isSessionActive}
                className={`h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[26px] border ${
                  isProcessing || isSessionActive
                    ? "border-white/10 bg-slate-700"
                    : "border-indigo-300/40 bg-indigo-500"
                } shadow-[0_18px_45px_rgba(79,70,229,0.4)]`}
              >
                <MaterialIcons
                  name={isProcessing || isSessionActive ? "hourglass-top" : "camera-alt"}
                  size={30}
                  color="white"
                />
              </TouchableOpacity>
            </View>
            <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <View
                className="h-full rounded-full bg-indigo-400"
                style={{ width: `${isSessionActive ? 45 : 100}%` }}
              />
            </View>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-xs font-medium uppercase tracking-[1.5px] text-slate-300">
                {isSessionActive ? "Capture active" : "Tap to scan"}
              </Text>
              <View className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Text className="text-[10px] font-semibold uppercase tracking-[1.8px] text-slate-200">
                  Touch and go
                </Text>
              </View>
            </View>
          </View>
        </Pressable>

        <SuccessOverlay
          visible={successState.visible}
          employeeName={successState.employeeName}
          offline={successState.offline}
        />

        <EnrollmentCaptureOverlay
          visible={Boolean(enrollmentSession)}
          employee={enrollmentSession?.employeeForm}
          sampleCount={registrationSamples.length}
          previews={registrationSamples}
          busy={captureBusy}
          error={captureError}
          onClose={closeEnrollment}
          onCapture={captureRegistrationSample}
          onSave={registerEmployeeWithEmbedding}
        />
      </KioskCamera>

      <AdminPanel
        visible={adminVisible}
        onClose={() => setAdminVisible(false)}
        onBeginEnrollment={startEnrollment}
        registrationSamples={registrationSamples}
        onImportEmployees={async () => {
          try {
            const result = await importEmployeesFromServer();
            Alert.alert("Import complete", `${result.count} employees imported from the website.`);
          } catch (error) {
            Alert.alert("Import failed", error.message);
          }
        }}
        employees={employees}
        logs={logs}
        scanDiagnostic={lastDiagnostic}
        syncing={syncing}
        onSync={async () => {
          try {
            const result = await syncNow();
            Alert.alert("Sync status", result.message || `${result.syncedCount} records synced.`);
          } catch (error) {
            Alert.alert("Sync failed", error.message || "Unable to sync right now.");
          }
        }}
        onRegisterDevice={async () => {
          try {
            await registerDevice();
            Alert.alert("Device registered", "This kiosk is now registered with the dashboard backend.");
          } catch (error) {
            Alert.alert("Registration failed", error.message);
          }
        }}
        onLogout={async () => {
          await logoutKiosk();
          setAdminVisible(false);
          setRegistrationSamples([]);
          setEnrollmentSession(null);
        }}
        settings={settings}
        onSaveSettings={updateSettings}
      />

      <PinUnlockModal
        visible={pinVisible}
        expectedPin={String(settings.adminPin || "1234").trim()}
        onClose={() => setPinVisible(false)}
        onUnlock={() => {
          setPinVisible(false);
          setAdminVisible(true);
        }}
      />
    </View>
  );
}

export default RootScreen;
