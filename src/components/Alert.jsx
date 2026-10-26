export default function Alert({ type = "error", children }) {
  if (!children) return null;

  const styles =
    type === "success"
      ? "bg-emerald-50 text-emerald-800"
      : "bg-red-50 text-red-700";

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`mb-4 rounded-xl px-4 py-3 text-sm leading-relaxed ${styles}`}
    >
      {children}
    </div>
  );
}
