import { Construction } from "lucide-react";

// Generic page frame for tabs not built yet.
export default function PageShell({ title, subtitle, children }) {
  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
      <p className="text-slate-500 text-[14px] mt-1 mb-6">{subtitle}</p>
      {children || (
        <div className="card p-12 grid place-items-center text-center text-slate-500">
          <Construction size={36} className="text-brand mb-3" />
          <p className="font-semibold text-ink">{title} is ready to build</p>
          <p className="text-[13px] mt-1">
            Replace this block in <code>src/pages/{title}.jsx</code>.
          </p>
        </div>
      )}
    </div>
  );
}
