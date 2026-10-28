import { Loader2 } from "lucide-react";

export default function Button({ loading, children, ...props }) {
  return (
    <button
      className="h-12 w-full rounded-lg bg-[#16915f] text-white text-base font-semibold flex items-center justify-center gap-2.5 transition hover:bg-[#0f7a50] active:translate-y-px disabled:opacity-70 disabled:cursor-progress focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16915f]  focus-visible:ring-offset-2"
      disabled={loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      <span>{children}</span>
    </button>
  );
}
