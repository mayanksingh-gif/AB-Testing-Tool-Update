import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTest } from "@/lib/queries";
import NewTestForm from "@/components/NewTestForm";

export const dynamic = "force-dynamic";

export default function EditTestPage({ params }: { params: { id: string } }) {
  const test = getTest(params.id);
  if (!test) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={`/tests/${test.id}`}
        className="mb-6 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Back to test
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Edit Test</h1>
      <p className="mb-8 text-sm text-slate-500">
        Saving changes here permanently deletes all results collected under the current configuration.
      </p>
      <NewTestForm test={test} />
    </main>
  );
}
