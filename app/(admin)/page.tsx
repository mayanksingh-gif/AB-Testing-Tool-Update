import Link from "next/link";
import { FlaskConical, ListChecks, ArrowRight } from "lucide-react";
import { listAllStudies, type StudySummary } from "@/lib/queries";
import StudyRowMenu from "@/components/StudyRowMenu";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  draft: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style}`}>
      {status}
    </span>
  );
}

// Distinct from --variant-a/--variant-b (reserved for A-vs-B chart data in
// Results) — these are UI-chrome colors for the type pill only.
const TYPE_STYLES: Record<StudySummary["study_type"], string> = {
  ab: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
  usability: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
};

function TypeBadge({ type }: { type: StudySummary["study_type"] }) {
  const Icon = type === "ab" ? FlaskConical : ListChecks;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TYPE_STYLES[type]}`}>
      <Icon size={11} strokeWidth={2.25} aria-hidden="true" />
      {type === "ab" ? "A/B" : "Usability"}
    </span>
  );
}

function resultsHref(study: StudySummary) {
  return study.study_type === "ab" ? `/tests/${study.id}/results` : `/studies/${study.id}/usability/results`;
}

function detailHref(study: StudySummary) {
  return study.study_type === "ab" ? `/tests/${study.id}` : `/studies/${study.id}`;
}

export default function DashboardPage() {
  const studies = listAllStudies();
  const totalParticipants = studies.reduce((sum, s) => sum + s.participants, 0);
  const publishedCount = studies.filter((s) => s.status === "published").length;
  const recentStudies = studies.slice(0, 8);

  return (
    <main className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        {/* Welcome header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Welcome back</p>
          <h1 className="mt-1 font-serif-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Your studies, at a glance
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
            Run A/B tests with separate participant links, or guide people step-by-step through a
            multi-screen Figma prototype.
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">Total Studies</div>
            <div className="mt-1.5 text-2xl font-semibold text-slate-900">{studies.length}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">Published Studies</div>
            <div className="mt-1.5 text-2xl font-semibold text-slate-900">{publishedCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs font-medium text-slate-500">Total Participants</div>
            <div className="mt-1.5 text-2xl font-semibold text-slate-900">{totalParticipants}</div>
          </div>
        </div>

        {/* Create-a-new-study cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/tests/new"
            className="group flex flex-col justify-between rounded-xl border border-orange-100 bg-orange-50/60 p-6 transition hover:border-orange-200 hover:bg-orange-50"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm">
                <FlaskConical size={18} strokeWidth={2} aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-900">A/B Testing</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Compare two prototype variants with separate links.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-orange-700">
              Create a new study
              <ArrowRight size={15} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
          </Link>

          <Link
            href="/studies/new/usability"
            className="group flex flex-col justify-between rounded-xl border border-violet-100 bg-violet-50/60 p-6 transition hover:border-violet-200 hover:bg-violet-50"
          >
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
                <ListChecks size={18} strokeWidth={2} aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-900">Usability Testing</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Guide participants through multiple steps in sequence.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-violet-700">
              Create a new study
              <ArrowRight size={15} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
          </Link>
        </div>

        {/* Recent studies table */}
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-slate-900">Recent Studies</h2>

          {studies.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-14 text-center">
              <p className="text-sm font-medium text-slate-900">No studies yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first study above to get started.</p>
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="hidden px-5 py-3 sm:table-cell">Task</th>
                    <th className="hidden px-5 py-3 sm:table-cell">Date</th>
                    <th className="px-5 py-3 text-right">Status</th>
                    <th className="w-10 px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {recentStudies.map((study) => (
                    <tr key={study.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="max-w-[220px] truncate px-5 py-3.5">
                        <Link href={detailHref(study)} className="font-medium text-slate-900 hover:underline">
                          {study.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <TypeBadge type={study.study_type} />
                      </td>
                      <td className="hidden max-w-[240px] truncate px-5 py-3.5 text-slate-500 sm:table-cell">
                        {study.task ?? "—"}
                      </td>
                      <td className="hidden whitespace-nowrap px-5 py-3.5 text-slate-500 sm:table-cell">
                        {new Date(study.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <StatusBadge status={study.status} />
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <StudyRowMenu
                          study={study}
                          detailHref={detailHref(study)}
                          resultsHref={resultsHref(study)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
