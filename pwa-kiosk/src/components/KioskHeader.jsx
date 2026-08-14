import { LogOut } from "lucide-react";

export function KioskHeader({ title, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Attendify PWA Kiosk</p>
        <h1>{title}</h1>
      </div>
      <button className="icon-button" type="button" onClick={onLogout} aria-label="Log out">
        <LogOut size={20} />
      </button>
    </header>
  );
}
