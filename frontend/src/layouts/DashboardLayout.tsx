import { Outlet, useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import Sidebar from "../components/Sidebar";

const titles: Record<string, string> = {
  "/dashboard": "Overview",
  "/contracts": "Contracts",
  "/ask-ai": "Ask AI",
  "/compare": "Compare contracts",
};

export default function DashboardLayout() {
  const location = useLocation();
  const title =
    titles[location.pathname] ??
    (location.pathname.startsWith("/contracts/") ? "Contract analysis" : "Counsel");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h1 className="text-lg font-semibold text-ink-900">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 sm:flex">
              <Search size={15} />
              <span>Search contracts…</span>
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
              <Bell size={16} />
            </button>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-sm font-medium text-white">
              JD
            </span>
          </div>
        </header>
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
