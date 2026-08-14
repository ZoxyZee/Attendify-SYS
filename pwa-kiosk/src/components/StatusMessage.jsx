export function StatusMessage({ tone, children }) {
  return <div className={`status ${tone}`}>{children}</div>;
}
