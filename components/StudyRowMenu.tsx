"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, Copy, ArrowRight } from "lucide-react";
import { duplicateTestAction } from "@/lib/actions";
import type { StudySummary } from "@/lib/queries";

// Per-row "..." action menu for the Recent Studies table. Edit/Duplicate
// stay A/B-only (usability studies keep their existing "Edit Steps" flow on
// their own detail page) — mirrors the branching that used to live inline
// in the old card-list markup on app/(admin)/page.tsx.
export default function StudyRowMenu({
  study,
  detailHref,
  resultsHref,
}: {
  study: StudySummary;
  detailHref: string;
  resultsHref: string;
}) {
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
        aria-label="Study actions"
        className="flex min-h-9 min-w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreHorizontal size={18} strokeWidth={2} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          <Link
            href={resultsHref}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            View Results
          </Link>
          {study.study_type === "ab" && (
            <>
              <Link
                href={`/tests/${study.id}/edit`}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                Edit
              </Link>
              <form action={duplicateTestAction.bind(null, study.id)}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Copy size={14} strokeWidth={2} aria-hidden="true" />
                  Duplicate
                </button>
              </form>
            </>
          )}
          {study.study_type === "usability" && (
            <Link
              href={detailHref}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <Pencil size={14} strokeWidth={2} aria-hidden="true" />
              Edit Steps
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
