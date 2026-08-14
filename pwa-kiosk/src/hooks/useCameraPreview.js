import { useEffect, useRef, useState } from "react";

export const useCameraPreview = (enabled) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState("Camera idle");

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let active = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("Camera unavailable in this browser");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraState("Camera ready");
      } catch (error) {
        setCameraState(error.message || "Camera permission blocked");
      }
    };

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [enabled]);

  return { videoRef, cameraState };
};
