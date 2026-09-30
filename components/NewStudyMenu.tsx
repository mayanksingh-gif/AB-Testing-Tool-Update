"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, FlaskConical, ListChecks, ChevronDown } from "lucide-react";

// Plain two-option popover — no new dependency beyond the already-approved
// lucide-react icon set. Replaces the single "New Test" link on the
// dashboard now that there are two study types to choose between.
export default function NewStudyMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100"
      >
        <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
        New Study
        <ChevronDown size={14} strokeWidth={2.25} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <Link
            href="/tests/new"
            className="flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            <FlaskConical size={18} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
            <span>
              <span className="block text-sm font-medium text-slate-900">A/B Test</span>
              <span className="block text-xs text-slate-500">Compare two prototype variants with separate links.</span>
            </span>
          </Link>
          <Link
            href="/studies/new/usability"
            className="flex items-start gap-3 border-t border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            <ListChecks size={18} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
            <span>
              <span className="block text-sm font-medium text-slate-900">Usability Test</span>
              <span className="block text-xs text-slate-500">Guide participants through multiple steps in sequence.</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
