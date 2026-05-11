import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, registerCompany, loading } = useAuth();
  const [mode, setMode] = useState("signin");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    company_name: "",
    admin_email: "",
    subscription_plan: "starter",
    name: "",
    password: ""
  });
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await login(formData);
      navigate(from, { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await registerCompany(signupData);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  if (loading) {
    return <Loader fullscreen label={mode === "signin" ? "Signing you in" : "Creating your workspace"} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/50 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/80 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-sky-900 p-10 text-white lg:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">
                <img src="/attendify-logo.png" alt="Attendify logo" className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10" />
                Attendify
              </div>
              <h1 className="mt-6 max-w-md text-5xl font-semibold leading-tight">
                Attendance operations designed like a modern control center.
              </h1>
              <p className="mt-4 max-w-md text-base text-slate-300">
                Monitor employees, kiosks, and attendance flows with a dashboard tuned for daily operations.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                "Real-time presence tracking",
                "Company-level tenant isolation",
                "Device monitoring and sync visibility"
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  <span className="text-sm text-slate-100">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10 lg:p-14">
          <div className="mx-auto max-w-md">
            <img src="/attendify-logo.png" alt="Attendify" className="h-16 w-16 rounded-2xl object-cover shadow-float ring-1 ring-slate-200 dark:ring-slate-800" />
            <div className="mt-6 inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
              {[
                { key: "signin", label: "Sign In" },
                { key: "signup", label: "Create Account" }
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setMode(option.key);
                    setError("");
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    mode === option.key
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {mode === "signin" ? "Welcome back" : "Create your workspace"}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {mode === "signin"
                ? "Sign in to manage employees, attendance, devices, and reports."
                : "Register your company and create the first admin account for Attendify."}
            </p>

            <form className="mt-8 space-y-5" onSubmit={mode === "signin" ? handleSubmit : handleRegister}>
              {mode === "signup" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Company Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Acme Technologies"
                      value={signupData.company_name}
                      onChange={(event) => setSignupData((current) => ({ ...current, company_name: event.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Admin Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Rahul Sharma"
                      value={signupData.name}
                      onChange={(event) => setSignupData((current) => ({ ...current, name: event.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Plan</label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <select
                        className="input pl-11"
                        value={signupData.subscription_plan}
                        onChange={(event) =>
                          setSignupData((current) => ({ ...current, subscription_plan: event.target.value }))
                        }
                      >
                        <option value="starter">Starter</option>
                        <option value="growth">Growth</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="admin@company.com"
                  value={mode === "signin" ? formData.email : signupData.admin_email}
                  onChange={(event) =>
                    mode === "signin"
                      ? setFormData((current) => ({ ...current, email: event.target.value }))
                      : setSignupData((current) => ({ ...current, admin_email: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder={mode === "signin" ? "Enter password" : "Create password"}
                  value={mode === "signin" ? formData.password : signupData.password}
                  onChange={(event) =>
                    mode === "signin"
                      ? setFormData((current) => ({ ...current, password: event.target.value }))
                      : setSignupData((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary w-full gap-2">
                {mode === "signin" ? "Sign In" : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
