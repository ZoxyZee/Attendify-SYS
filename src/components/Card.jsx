function Card({ title, subtitle, value, icon: Icon, accent = "primary", children }) {
  const accentMap = {
    primary: "from-indigo-500/15 to-sky-500/10 text-primary",
    success: "from-emerald-500/15 to-teal-500/10 text-emerald-600",
    warning: "from-amber-500/15 to-orange-500/10 text-amber-600",
    dark: "from-slate-900/10 to-slate-700/10 text-slate-700 dark:text-slate-100"
  };

  return (
    <div className="glass-panel group p-6 transition duration-300 hover:-translate-y-1 hover:shadow-float">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          {value !== undefined && (
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {value}
            </h3>
          )}
          {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>

        {Icon && (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accentMap[accent]} shadow-inner`}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export default Card;
