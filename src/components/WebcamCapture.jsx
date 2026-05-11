import { Camera, RefreshCcw, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function WebcamCapture({ capturedImage, disabled = false, onCapture, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 960 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch (error) {
        onError?.("Camera permission is needed for dashboard face capture.");
      }
    };

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [onError]);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      onError?.("Camera is still warming up. Try again in a moment.");
      return;
    }

    const canvas = document.createElement("canvas");
    const maxWidth = 720;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-800">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured employee"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-8 rounded-[50%] border-2 border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.28)]" />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm font-medium text-white">
            Starting camera...
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={captureFrame}
        className="btn-secondary w-full gap-2"
        disabled={disabled || !cameraReady}
      >
        {capturedImage ? <RefreshCcw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
        {capturedImage ? "Retake Photo" : "Capture Photo"}
      </button>

      <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        <Video className="mt-0.5 h-4 w-4 shrink-0" />
        Keep one face centered in the oval, with even light on the face.
      </div>
    </div>
  );
}

export default WebcamCapture;
