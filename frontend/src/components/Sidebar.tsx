import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileStack, MessagesSquare, GitCompare, Scale, Settings } from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/contracts", label: "Contracts", icon: FileStack },
  { to: "/ask-ai", label: "Ask AI", icon: MessagesSquare },
  { to: "/compare", label: "Compare", icon: GitCompare },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white">
          <Scale size={16} />
        </span>
        <span className="font-serif text-lg font-semibold text-ink-900">Counsel</span>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-accent-50 text-accent-700" : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/settings"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"
      >
        <Settings size={17} />
        Settings
      </NavLink>
    </aside>
  );
}
