export function CameraLayer({ videoRef }) {
  return (
    <section className="camera-layer">
      <video ref={videoRef} autoPlay playsInline muted />
      <div className="camera-overlay" />
    </section>
  );
}
