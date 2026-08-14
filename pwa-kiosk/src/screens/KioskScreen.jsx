import { CameraLayer } from "../components/CameraLayer";
import { KioskControls } from "../components/KioskControls";
import { KioskHeader } from "../components/KioskHeader";
import { ScanGuide } from "../components/ScanGuide";

export function KioskScreen(props) {
  return (
    <main className="app kiosk-screen">
      <CameraLayer videoRef={props.videoRef} />
      <KioskHeader title={props.title} onLogout={props.onLogout} />
      <ScanGuide cameraState={props.cameraState} />
      <KioskControls {...props} />
    </main>
  );
}
