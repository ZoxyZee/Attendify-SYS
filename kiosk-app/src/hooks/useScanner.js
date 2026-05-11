import { useCallback, useEffect, useRef, useState } from "react";

import { recognizeEmployee } from "../services/recognitionService";

const CAPTURE_TIMEOUT_MS = 8000;
const RECOGNITION_TIMEOUT_MS = 45000;
const SESSION_TIMEOUT_MS = 60000;

export const useScanner = ({ cameraRef, cameraReady, employees, settings, enabled, onRecognized, onCaptureStuck }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanHint, setScanHint] = useState("Align your face inside the guide");
  const [lastDiagnostic, setLastDiagnostic] = useState("Idle");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const sessionTimeoutRef = useRef(null);
  const countdownRef = useRef(null);
  const captureWatchdogRef = useRef(null);
  const latestFailureRef = useRef(null);
  const isSessionActiveRef = useRef(false);
  const isProcessingRef = useRef(false);

  const withTimeout = useCallback(
    (operation, message, timeoutMs) =>
      new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);

        Promise.resolve()
          .then(operation)
          .then(resolve)
          .catch(reject)
          .finally(() => clearTimeout(timeoutId));
      }),
    []
  );

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) {
      throw new Error("Camera is still getting ready.");
    }

    const picture = await cameraRef.current.takePictureAsync({
      base64: true,
      exif: false
    });

    if (!picture?.base64) {
      throw new Error("Camera did not return image data. Tap scan again.");
    }

    return picture;
  }, [cameraRef]);

  const stopScanSession = useCallback(
    (
      nextHint = "Ready to scan. Tap the camera button to start a 15 second scan window.",
      nextDiagnostic = null
    ) => {
    isSessionActiveRef.current = false;
    isProcessingRef.current = false;
    setIsSessionActive(false);
    setSecondsRemaining(0);
    setIsProcessing(false);
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (captureWatchdogRef.current) {
      clearTimeout(captureWatchdogRef.current);
      captureWatchdogRef.current = null;
    }
    setScanHint(nextHint);
    if (nextDiagnostic !== null) {
      setLastDiagnostic(nextDiagnostic);
    }
  }, []);

  const runScan = useCallback(async () => {
    if (!enabled || !cameraReady || !isSessionActiveRef.current || isProcessingRef.current || !cameraRef.current) {
      return;
    }

    if (!employees.length) {
      setLastDiagnostic("No employees on device");
      stopScanSession("Open admin mode and register an employee to begin", "No employees on device");
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    setScanHint("Capturing face...");
    setLastDiagnostic("📷 Capturing frame");
    if (captureWatchdogRef.current) {
      clearTimeout(captureWatchdogRef.current);
    }
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    sessionTimeoutRef.current = setTimeout(() => {
      if (!isProcessingRef.current) {
        return;
      }

      latestFailureRef.current = "Scan session expired. Tap scan again.";
      stopScanSession("Ready to scan. Tap the camera button to try again.", latestFailureRef.current);
      onCaptureStuck?.();
    }, SESSION_TIMEOUT_MS);

    captureWatchdogRef.current = setTimeout(() => {
      if (!isProcessingRef.current) {
        return;
      }

      latestFailureRef.current = "Camera capture is stuck. Tap scan again.";
      stopScanSession("Ready to scan. Tap the camera button to try again.", latestFailureRef.current);
      onCaptureStuck?.();
    }, CAPTURE_TIMEOUT_MS + 300);

    try {
      const photo = await withTimeout(
        capturePhoto,
        "Camera capture took too long. Tap scan again.",
        CAPTURE_TIMEOUT_MS
      );

      if (captureWatchdogRef.current) {
        clearTimeout(captureWatchdogRef.current);
        captureWatchdogRef.current = null;
      }

      setScanHint("🔍 Detecting & matching face...");
      setLastDiagnostic("🤖 Processing with ML models...");

      const recognition = await withTimeout(
        () =>
          recognizeEmployee({
            base64: photo.base64,
            employees,
            settings
          }),
        "Recognition took too long. Tap scan again.",
        RECOGNITION_TIMEOUT_MS
      );

      setFaceDetected(true);
      setLastDiagnostic(`Matched ${recognition.employee_name} (${recognition.confidence})`);
      latestFailureRef.current = null;
      setScanHint(`Recognized ${recognition.employee_name}`);

      await onRecognized(recognition);

      setLastDiagnostic(`Attendance written for ${recognition.employee_name}`);
      stopScanSession("Attendance captured successfully", `Attendance written for ${recognition.employee_name}`);
    } catch (error) {
      setFaceDetected(false);
      const message = error.message || "Unable to scan right now";

      latestFailureRef.current = message;
      setScanHint(message);
      setLastDiagnostic(message);

      if (message.includes("too long")) {
        stopScanSession("Ready to scan. Tap the camera button to try again.", message);
        if (message.includes("Camera")) {
          onCaptureStuck?.();
        }
      } else {
        stopScanSession("Ready to scan. Tap the camera button to try again.", message);
      }
    } finally {
      if (captureWatchdogRef.current) {
        clearTimeout(captureWatchdogRef.current);
        captureWatchdogRef.current = null;
      }
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [cameraReady, cameraRef, capturePhoto, employees, enabled, onCaptureStuck, onRecognized, secondsRemaining, settings, stopScanSession, withTimeout]);

  const startScanSession = useCallback(() => {
    if (!enabled || !cameraReady) {
      setScanHint("Camera is still getting ready");
      setLastDiagnostic("Camera not ready");
      return;
    }

    if (!employees.length) {
      setScanHint("Open admin mode and register an employee to begin");
      setLastDiagnostic("No employees on device");
      return;
    }

    latestFailureRef.current = null;
    stopScanSession();
    setFaceDetected(false);
    isSessionActiveRef.current = true;
    setIsSessionActive(true);
    setSecondsRemaining(0);
    setScanHint("Capturing face. Hold still.");
    setLastDiagnostic("Starting capture");

    setTimeout(runScan, 150);
  }, [cameraReady, employees.length, enabled, runScan, stopScanSession]);

  useEffect(() => {
    if (!enabled) {
      stopScanSession("Ready to scan. Tap the camera button to start a 15 second scan window.");
    }
  }, [enabled, stopScanSession]);

  useEffect(
    () => () => {
      stopScanSession();
    },
    [stopScanSession]
  );

  return {
    isProcessing,
    faceDetected,
    scanHint,
    lastDiagnostic,
    isSessionActive,
    secondsRemaining,
    runScan: startScanSession,
    stopScanSession
  };
};
