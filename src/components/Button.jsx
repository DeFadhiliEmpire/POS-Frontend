import { Loader2 } from "lucide-react";

export default function Button({ loading, children, ...props }) {
  return (
    <button
      className="h-12 w-full rounded-lg bg-green-600 text-white text-base font-semibold flex items-center justify-center gap-2.5 transition hover:bg-green-700 active:translate-y-px disabled:opacity-70 disabled:cursor-progress focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
      disabled={loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      <span>{children}</span>
    </button>
  );
}
