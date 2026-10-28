import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  Users,
  Truck,
  BarChart3,
  Settings,
  Store,
  ChevronDown,
  CloudCheck,
  LogOut,
} from "lucide-react";
import { useContext } from "react";
import { AuthContext } from "../../AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: ClipboardList },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const initials = (name = "") =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  return (
    <aside className="h-full w-[240px] bg-[#0b1722] text-slate-300 flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-6 pb-7">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-brand grid place-items-center text-white font-extrabold text-xl">
          {user?.businessName?.[0] || "?"}
        </div>
        <div className="leading-tight">
          <p className="text-white font-bold text-[17px]">
            {" "}
            {user?.businessName || "Business Name"} POS
          </p>
          <p className="text-[11px] text-slate-400">Simple. Fast. Reliable.</p>
        </div>
      </div>

      <nav className="px-3 flex-1 space-y-1.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3.5 h-11 px-4 rounded-lg text-[14px] font-medium transition border-l-[3px] ${
                isActive
                  ? "bg-gradient-to-r from-[#0f5c41] to-[#0d3f31] text-white border-emerald-400"
                  : "border-transparent hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <Icon size={19} strokeWidth={1.8} /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 space-y-2.5">
        <button className="w-full flex items-center gap-3 p-3 rounded-xl border border-white/10 hover:bg-white/5 text-left">
          <span className="w-9 h-9 rounded-lg bg-white/10 grid place-items-center">
            <Store size={18} />
          </span>
          <span className="flex-1 leading-tight">
            <b className="block text-[12.5px] text-white font-semibold">
              {user?.businessName || "Business"}
            </b>
            <span className="text-[11px] text-slate-400">Main Store</span>
          </span>
          <ChevronDown size={16} />
        </button>
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="w-9 h-9 rounded-full bg-white/10 grid place-items-center text-[12px] font-semibold text-white">
            {initials(user.name)}
          </span>
          <span className="flex-1 leading-tight">
            <b className="block text-[13px] text-white font-semibold">
              {user?.name}
            </b>
            <span className="text-[11px] text-slate-400 capitalize">
              {user?.role === "client" ? "Owner" : user?.role}
            </span>
          </span>
          <button
            aria-label="Sign out"
            title="Sign out"
            onClick={() => {
              navigate("/login");
            }}
            className="p-1.5 rounded-md hover:bg-white/10"
          >
            <LogOut size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20 px-3 py-2.5 text-[12px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="leading-tight">
            <b className="block text-emerald-300 font-medium">Online</b>
            <span className="text-[11px] text-slate-400">
              Last sync: 2 min ago
            </span>
          </span>
          <CloudCheck size={16} className="ml-auto text-emerald-300" />
        </div>
      </div>
    </aside>
  );
}
