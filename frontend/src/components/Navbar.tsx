import { Link } from "react-router-dom";
import { Scale } from "lucide-react";

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white">
            <Scale size={16} />
          </span>
          <span className="font-serif text-lg font-semibold text-ink-900">Counsel</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 sm:flex">
          <a href="#features" className="hover:text-ink-900">Features</a>
          <a href="#how-it-works" className="hover:text-ink-900">How it works</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-ink-900 sm:inline"
          >
            Try demo
          </Link>
          <Link
            to="/contracts"
            className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-700"
          >
            Analyze a contract
          </Link>
        </div>
      </div>
    </header>
  );
}
