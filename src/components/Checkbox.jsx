import { Check } from "lucide-react";

export default function Checkbox({ checked, onChange, children }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none text-[13px]">
      {/* Hidden real checkbox */}
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />

      {/* Visual replacement */}
      <span
        className="
          w-4.5 h-4.5 grid place-items-center rounded border border-slate-400 bg-white
          peer-checked:bg-green-600 peer-checked:border-green-600
          peer-focus-visible:ring-2 peer-focus-visible:ring-green-600
          [&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100
        "
      >
        <Check size={12} strokeWidth={3.5} className="text-white" />
      </span>

      {children}
    </label>
  );
}
