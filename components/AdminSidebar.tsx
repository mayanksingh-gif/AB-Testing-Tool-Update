"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FlaskConical, ListChecks, Settings, HelpCircle } from "lucide-react";

// Persistent left nav for the researcher-facing (admin) route group only —
// participant-facing routes (app/test/[id]/[variant], app/usability/[id])
// live outside app/(admin) and never render this. Settings/Help are
// present but disabled ("Soon") — no settings/help surface exists yet in
// this app, and building one is out of scope for this pass.
const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/tests/new", label: "A/B Testing", icon: FlaskConical },
  { href: "/studies/new/usability", label: "Usability Testing", icon: ListChecks },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 sm:flex">
      <div className="px-2 text-lg font-semibold tracking-tight text-slate-900">TestFlow</div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 items-center gap-2.5 rounded-md px-3 text-sm font-medium ${
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-slate-100 pt-4">
        <button
          type="button"
          disabled
          className="flex min-h-11 cursor-not-allowed items-center justify-between gap-2.5 rounded-md px-3 text-sm font-medium text-slate-400"
        >
          <span className="flex items-center gap-2.5">
            <Settings size={16} strokeWidth={2} aria-hidden="true" />
            Settings
          </span>
          <span className="text-[10px] uppercase tracking-wide text-slate-300">Soon</span>
        </button>
        <button
          type="button"
          disabled
          className="flex min-h-11 cursor-not-allowed items-center justify-between gap-2.5 rounded-md px-3 text-sm font-medium text-slate-400"
        >
          <span className="flex items-center gap-2.5">
            <HelpCircle size={16} strokeWidth={2} aria-hidden="true" />
            Help
          </span>
          <span className="text-[10px] uppercase tracking-wide text-slate-300">Soon</span>
        </button>
      </div>
    </aside>
  );
}
