import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Copy } from "lucide-react";
import { getTest } from "@/lib/queries";
import { publishTestAction, duplicateTestAction } from "@/lib/actions";
import CopyLinkButton from "@/components/CopyLinkButton";
import { getOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

export default function TestOverviewPage({ params }: { params: { id: string } }) {
  const test = getTest(params.id);
  if (!test) notFound();

  const origin = getOrigin(headers());
  const linkA = `${origin}/test/${test.id}/a`;
  const linkB = `${origin}/test/${test.id}/b`;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Back to home
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">{test.name}</h1>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/tests/${test.id}/edit`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil size={14} strokeWidth={2} aria-hidden="true" />
            Edit
          </Link>
          <form action={duplicateTestAction.bind(null, test.id)}>
            <button
              type="submit"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Copy size={14} strokeWidth={2} aria-hidden="true" />
              Duplicate
            </button>
          </form>
        </div>
      </div>
      <div className="mt-1 flex gap-2">
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
          {test.status}
        </span>
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-600">
          {test.device_type}
        </span>
      </div>

      <div className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <div className="text-xs font-medium uppercase text-slate-400">Task</div>
          <p className="mt-1 text-sm text-slate-800">{test.task}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium uppercase text-slate-400">Prototype A</div>
            <p className="mt-1 truncate text-sm text-slate-600">{test.figma_url_a}</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-slate-400">Prototype B</div>
            <p className="mt-1 truncate text-sm text-slate-600">{test.figma_url_b}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium uppercase text-slate-400">Target A</div>
            <p className="mt-1 text-sm text-slate-600">{test.target_a ?? "—"}</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase text-slate-400">Target B</div>
            <p className="mt-1 text-sm text-slate-600">{test.target_b ?? "—"}</p>
          </div>
        </div>
      </div>

      {test.status !== "published" ? (
        <form action={publishTestAction.bind(null, test.id)} className="mt-6">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Publish Test
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium uppercase text-slate-400">Variant A</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <code className="truncate text-sm text-slate-700">{linkA}</code>
              <CopyLinkButton text={linkA} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-medium uppercase text-slate-400">Variant B</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <code className="truncate text-sm text-slate-700">{linkB}</code>
              <CopyLinkButton text={linkB} />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Send each link to the participant group you want to test that version with.
          </p>
          <Link
            href={`/tests/${test.id}/results`}
            className="inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View Results
          </Link>
        </div>
      )}
    </main>
  );
}
