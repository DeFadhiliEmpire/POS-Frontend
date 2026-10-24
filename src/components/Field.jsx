import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

const iconCls =
  "absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none";

export default function Field({ icon: Icon, className = "", ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon size={18} strokeWidth={1.8} className={iconCls} />}
      <input
        className={`w-full h-12 rounded-lg border border-line bg-slate-50 px-3.5 text-sm text-ink placeholder:text-slate-400 transition focus:outline-none focus:bg-white focus:border-green-600 focus:ring-2 focus:ring-green-600 focus:ring-opacity-40 ${Icon ? "pl-11" : ""} ${className}`}
        {...props}
      />
    </div>
  );
}

export function PasswordField({ icon: Icon = Lock, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Icon size={18} strokeWidth={1.8} className={iconCls} />
      <input
        type={show ? "text" : "password"}
        className="w-full h-12 rounded-lg border border-line bg-slate-50 px-3.5 text-sm text-ink placeholder:text-slate-400 transition focus:outline-none focus:bg-white focus:border-green-600 focus:ring-2 focus:ring-green-600 focus:ring-opacity-20 pl-11 pr-11"
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:text-ink"
      >
        {show ? (
          <EyeOff size={18} strokeWidth={1.8} />
        ) : (
          <Eye size={18} strokeWidth={1.8} />
        )}
      </button>
    </div>
  );
}
