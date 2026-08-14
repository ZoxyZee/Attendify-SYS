import { useState } from "react";
import { RefreshCw, Wifi } from "lucide-react";

import { API_BASE_URL } from "../config/api";
import { StatusMessage } from "./StatusMessage";

export function LoginScreen({ loading, onLogin, status }) {
  const [form, setForm] = useState({ email: "", password: "" });

  const submit = (event) => {
    event.preventDefault();
    onLogin(form);
  };

  return (
    <main className="app login-screen">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Attendify PWA</p>
          <h1>Fast Kiosk Login</h1>
          <p className="muted">Use the same admin account as the web dashboard.</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? <RefreshCw className="spin" size={20} /> : <Wifi size={20} />}
            Connect
          </button>
        </form>
        <StatusMessage tone={status.tone}>{status.text}</StatusMessage>
        <p className="api-line">Backend: {API_BASE_URL}</p>
      </section>
    </main>
  );
}
