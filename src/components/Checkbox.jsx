import { Check } from "lucide-react";
export default function Checkbox({ checked, onChange, children }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none text-[13px]">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className="w-[18px] h-[18px] grid place-items-center rounded border-[1.5px] border-slate-400 bg-white
                       peer-checked:bg-brand peer-checked:border-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand
                       [&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100"
      >
        <Check size={12} strokeWidth={3.5} color="#fff" />
      </span>
      {children}
    </label>
  );
}
