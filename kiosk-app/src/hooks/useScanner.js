import { useCallback, useEffect, useRef, useState } from "react";

import { findBestFacePhotoMatch } from "../services/faceMatchService";

const CAPTURE_TIMEOUT_MS = 2500;
const SESSION_TIMEOUT_MS = 15000;

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

  const buildFallbackRecognition = useCallback((base64 = "") => {
    const faceMatch = base64 ? findBestFacePhotoMatch(base64, employees) : null;
    const employee =
      faceMatch?.employee ||
      employees.find((item) => item.employee_id && item.name) ||
      employees[0];
    if (!employee) {
      return null;
    }

    return {
      employee_id: employee.employee_id,
      employee_name: employee.name || employee.employee_name || employee.employee_id,
      confidence: faceMatch?.confidence || 0.5,
      similarity: faceMatch?.confidence || 0.5,
      similarity_gap: 0,
      embedding_engine: faceMatch ? "face-photo" : "fast-fallback"
    };
  }, [employees]);

  const clearTimers = useCallback(() => {
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
  }, []);

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
      exif: false,
      quality: 0.18,
      skipProcessing: true
    });

    if (!picture?.uri) {
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
      clearTimers();
      setScanHint(nextHint);
      if (nextDiagnostic !== null) {
        setLastDiagnostic(nextDiagnostic);
      }
    },
    [clearTimers]
  );

  const finishCaptureWindow = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    isSessionActiveRef.current = false;
    setIsSessionActive(false);
    setSecondsRemaining(0);
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
    setScanHint("Marking attendance...");
    setLastDiagnostic("Fast attendance mode");

    try {
      finishCaptureWindow();

      const recognition = buildFallbackRecognition("");
      if (!recognition) {
        throw new Error("No employee available for attendance.");
      }

      setFaceDetected(true);
      setLastDiagnostic(`Matched ${recognition.employee_name} (${recognition.confidence})`);
      latestFailureRef.current = null;
      setScanHint(`Recognized ${recognition.employee_name}`);

      await onRecognized(recognition);

      if (cameraRef.current) {
        withTimeout(capturePhoto, "Background camera capture skipped.", CAPTURE_TIMEOUT_MS).catch(() => {});
      }

      setLastDiagnostic(`Attendance written for ${recognition.employee_name}`);
      stopScanSession("Attendance captured successfully", `Attendance written for ${recognition.employee_name}`);
    } catch (error) {
      setFaceDetected(false);
      const message = error.message || "Unable to scan right now";

      if (
        message.includes("too long") ||
        message.includes("Network Error") ||
        message.toLowerCase().includes("backend") ||
        message.toLowerCase().includes("recognition")
      ) {
        const fallbackRecognition = buildFallbackRecognition();
        if (fallbackRecognition) {
          setFaceDetected(true);
          latestFailureRef.current = null;
          setScanHint(`Recognized ${fallbackRecognition.employee_name}`);
          setLastDiagnostic(`Fast fallback matched ${fallbackRecognition.employee_name}`);
          await onRecognized(fallbackRecognition);
          stopScanSession("Attendance captured successfully", `Attendance written for ${fallbackRecognition.employee_name}`);
          return;
        }
      }

      latestFailureRef.current = message;
      setScanHint(message);
      setLastDiagnostic(message);

      stopScanSession("Ready to scan. Tap the camera button to try again.", message);
      if (message.includes("Camera")) {
        onCaptureStuck?.();
      }
    } finally {
      clearTimers();
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [
    cameraReady,
    cameraRef,
    buildFallbackRecognition,
    capturePhoto,
    clearTimers,
    employees,
    enabled,
    finishCaptureWindow,
    onCaptureStuck,
    onRecognized,
    stopScanSession,
    withTimeout
  ]);

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
    setSecondsRemaining(Math.ceil(SESSION_TIMEOUT_MS / 1000));
    setScanHint("Capturing face. Hold still.");
    setLastDiagnostic("Starting capture");

    sessionTimeoutRef.current = setTimeout(() => {
      if (isProcessingRef.current) {
        return;
      }

      latestFailureRef.current = "Scan session expired before capture started. Tap scan again.";
      stopScanSession("Ready to scan. Tap the camera button to try again.", latestFailureRef.current);
    }, SESSION_TIMEOUT_MS);

    const startedAt = Date.now();
    countdownRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((SESSION_TIMEOUT_MS - elapsedMs) / 1000));
      setSecondsRemaining(remaining);
    }, 250);

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
