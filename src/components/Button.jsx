import { Loader2 } from "lucide-react";

export default function Button({ loading, children, ...props }) {
  return (
    <button className="btn" disabled={loading} {...props}>
      {loading && <Loader2 size={16} className="animate-spin" />}
      <span>{children}</span>
    </button>
  );
}
