export default function Alert({ type = "error", children }) {
  if (!children) return null;
  const styles =
    type === "success"
      ? "bg-brand-soft text-emerald-800"
      : "bg-red-50 text-red-700";
  <div
    role="alert"
    className={`rounded-[10px] px-3.5 py-3 text-[13.5px] leading-snug mb-4 ${styles}`}
  >
    {children}
  </div>;
}
