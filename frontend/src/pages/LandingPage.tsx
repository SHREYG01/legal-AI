import { Link } from "react-router-dom";
import {
  FileSearch,
  ShieldAlert,
  ListChecks,
  CalendarClock,
  MessagesSquare,
  GitCompare,
  UploadCloud,
  Sparkles,
  FileCheck2,
} from "lucide-react";
import Navbar from "../components/Navbar";
import DisclaimerBanner from "../components/DisclaimerBanner";

function ContractMockup() {
  return (
    <svg viewBox="0 0 360 440" className="w-full max-w-sm" role="img" aria-label="Contract page with a flagged risky clause">
      <rect x="0" y="0" width="360" height="440" rx="10" fill="#FFFFFF" stroke="#E4E7EC" />
      <rect x="28" y="32" width="140" height="10" rx="2" fill="#0E1B32" />
      <rect x="28" y="54" width="304" height="6" rx="2" fill="#E4E7EC" />
      <rect x="28" y="68" width="304" height="6" rx="2" fill="#E4E7EC" />
      <rect x="28" y="82" width="220" height="6" rx="2" fill="#E4E7EC" />

      <rect x="28" y="112" width="90" height="8" rx="2" fill="#0E1B32" />
      <rect x="28" y="132" width="304" height="6" rx="2" fill="#E4E7EC" />
      <rect x="28" y="146" width="304" height="6" rx="2" fill="#E4E7EC" />
      <rect x="28" y="160" width="180" height="6" rx="2" fill="#E4E7EC" />

      {/* Flagged risky clause */}
      <rect x="20" y="190" width="320" height="64" rx="8" fill="#FEF2F2" stroke="#FCA5A5" />
      <rect x="36" y="204" width="288" height="6" rx="2" fill="#B91C1C" opacity="0.35" />
      <rect x="36" y="218" width="260" height="6" rx="2" fill="#B91C1C" opacity="0.35" />
      <rect x="36" y="232" width="200" height="6" rx="2" fill="#B91C1C" opacity="0.35" />

      <rect x="28" y="278" width="304" height="6" rx="2" fill="#E4E7EC" />
      <rect x="28" y="292" width="304" height="6" rx="2" fill="#E4E7EC" />
      <rect x="28" y="306" width="240" height="6" rx="2" fill="#E4E7EC" />

      <rect x="28" y="336" width="90" height="8" rx="2" fill="#0E1B32" />
      <rect x="28" y="356" width="304" height="6" rx="2" fill="#E4E7EC" />
      <rect x="28" y="370" width="180" height="6" rx="2" fill="#E4E7EC" />

      {/* Annotation callout */}
      <g transform="translate(238, 176)">
        <rect x="0" y="0" width="118" height="48" rx="8" fill="#0E1B32" />
        <polygon points="18,48 30,48 14,60" fill="#0E1B32" />
        <text x="10" y="18" fill="#FFFFFF" fontSize="9" fontFamily="Inter, sans-serif" fontWeight="600">
          Unlimited liability
        </text>
        <text x="10" y="32" fill="#93C5FD" fontSize="8" fontFamily="Inter, sans-serif">
          High severity · p.5
        </text>
      </g>
    </svg>
  );
}

const features = [
  { icon: FileSearch, title: "Plain-language summaries", desc: "Purpose, parties, duration, and payment terms distilled from dense legal text in seconds." },
  { icon: ShieldAlert, title: "Risk detection", desc: "Flags unlimited liability, one-sided termination, broad indemnification, and more — with severity and evidence." },
  { icon: ListChecks, title: "Obligation tracking", desc: "See exactly who owes what, and by when, across every clause in the contract." },
  { icon: CalendarClock, title: "Deadline extraction", desc: "Start, end, renewal, and notice dates pulled into one timeline you won't miss." },
  { icon: MessagesSquare, title: "Ask AI", desc: "Ask questions in plain English and get answers grounded in the actual contract, with page references." },
  { icon: GitCompare, title: "Version comparison", desc: "Upload two versions and see exactly what changed — additions, removals, and modifications." },
];

const steps = [
  { icon: UploadCloud, title: "Upload your contract", desc: "Drop in a PDF or DOCX — no formatting or cleanup needed." },
  { icon: Sparkles, title: "AI analyzes every clause", desc: "The contract is read, chunked, and analyzed for risk, obligations, and key terms." },
  { icon: FileCheck2, title: "Review and ask questions", desc: "Explore the findings, or ask Counsel anything about the contract directly." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2">
        <div>
          <h1 className="font-serif text-4xl font-semibold leading-tight text-ink-900 md:text-5xl">
            Read every contract like a lawyer would.
          </h1>
          <p className="mt-5 max-w-md text-lg text-slate-600">
            Counsel is an AI legal contract assistant that summarizes, classifies, and flags risk
            in your contracts — then lets you ask it questions directly.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/contracts"
              className="rounded-lg bg-ink-900 px-5 py-3 text-sm font-medium text-white hover:bg-ink-700"
            >
              Analyze a contract
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-medium text-ink-900 hover:bg-slate-50"
            >
              Try the demo
            </Link>
          </div>
        </div>
        <div className="flex justify-center">
          <ContractMockup />
        </div>
      </section>

      <section id="features" className="border-t border-slate-200 bg-slate-25 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-serif text-2xl font-semibold text-ink-900">
            Everything you need to understand a contract
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-card border border-slate-200 bg-white p-6 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 font-medium text-ink-900">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-serif text-2xl font-semibold text-ink-900">How it works</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 text-white">
                    <Icon size={17} />
                  </span>
                  <span className="text-sm font-medium text-slate-400">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 font-medium text-ink-900">{title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <DisclaimerBanner />
        </div>
      </section>
    </div>
  );
}
