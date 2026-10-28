import { useEffect, useRef } from "react";
import { Search, Wifi, Bell, ChevronDown, Menu } from "lucide-react";
import { useContext } from "react";
import { AuthContext } from "../../AuthContext";

const initials = (name = "") =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function Topbar({ onMenu }) {
  const ref = useRef(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlkey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex items-center gap-3 sm:gap-5 px-4 lg:px-6 py-3.5">
      <button
        className="lg:hidden p-2 rounded-lg hover:bg-white"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>
      <div className="relative flex-1 max-w-[720px]">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          ref={ref}
          placeholder="Search products, customers, or transactions..."
          className="w-full h-11 rounded-lg bg-white border border-slate-200 pl-11 pr-20 text-[14px] focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand/20"
        />
        <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 bg-slate-100 rounded-md px-2 py-1">
          Ctrl + K
        </kbd>
      </div>
      <div className="ml-auto flex items-center gap-4 sm:gap-6">
        <span className="hidden md:flex items-center gap-2 text-[13px] font-medium">
          <i className="w-2 h-2 rounded-full bg-emerald-500" />
          Store Online
          <Wifi size={16} className="text-emerald-600" />
        </span>
        <button className="relative p-1.5" aria-label="Notifications">
          <Bell size={20} />
          <b className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">
            3
          </b>
        </button>
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-full bg-[#0b1722] text-white grid place-items-center text-[13px] font-semibold">
            {initials(user.name)}
          </span>
          <span className="hidden sm:block leading-tight">
            <b className="block text-[13px]">{user.name}</b>
            <span className="text-[11px] text-slate-500">{user.role}</span>
          </span>
          <ChevronDown size={16} className="hidden sm:block" />
        </div>
      </div>
    </header>
  );
}
