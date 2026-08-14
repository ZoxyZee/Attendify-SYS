import { Camera } from "lucide-react";

export function ScanGuide({ cameraState }) {
  return (
    <section className="scan-guide">
      <div className="guide-box">
        <span />
        <span />
        <span />
        <span />
        <Camera size={58} />
      </div>
      <p>{cameraState}</p>
    </section>
  );
}
