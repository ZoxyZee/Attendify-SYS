function Modal({ open, title, children, onClose, footer, maxWidth = "max-w-lg" }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className={`w-full ${maxWidth} rounded-[32px] border border-white/40 bg-white p-6 shadow-2xl dark:border-white/5 dark:bg-slate-950`}>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-3 py-1.5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="mt-6">{children}</div>

        {footer && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
