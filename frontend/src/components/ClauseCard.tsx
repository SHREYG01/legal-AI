import { MapPin } from "lucide-react";
import type { Clause } from "../types";

const categoryStyles: Record<string, string> = {
  Payment: "bg-accent-50 text-accent-700",
  Confidentiality: "bg-purple-50 text-purple-700",
  Termination: "bg-risk-high/10 text-risk-high",
  "Intellectual Property": "bg-amber-50 text-amber-700",
  Liability: "bg-risk-high/10 text-risk-high",
  Arbitration: "bg-slate-100 text-slate-700",
  Warranty: "bg-teal-50 text-teal-700",
  Indemnification: "bg-risk-medium/10 text-risk-medium",
  "Non-compete": "bg-rose-50 text-rose-700",
  "Non-solicitation": "bg-rose-50 text-rose-700",
  "Governing Law": "bg-indigo-50 text-indigo-700",
  Other: "bg-slate-100 text-slate-500",
};

export default function ClauseCard({ clause }: { clause: Clause }) {
  const style = categoryStyles[clause.category] ?? categoryStyles.Other;
  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
          {clause.category}
        </span>
        <span className="text-xs text-slate-400">{Math.round(clause.confidence * 100)}% confidence</span>
      </div>
      <p className="mt-3 text-sm text-slate-700">{clause.text}</p>
      {clause.pageNumber && (
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <MapPin size={12} />
          Page {clause.pageNumber}
        </div>
      )}
    </div>
  );
}
