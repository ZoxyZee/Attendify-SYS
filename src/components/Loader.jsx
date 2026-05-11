function Loader({ fullscreen = false, label = "Loading" }) {
  return (
    <div className={fullscreen ? "flex min-h-screen items-center justify-center" : "flex items-center justify-center py-16"}>
      <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
      </div>
    </div>
  );
}

export default Loader;
