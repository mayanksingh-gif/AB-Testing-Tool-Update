import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewTestForm from "@/components/NewTestForm";

export default function NewTestPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to home
      </Link>
      <h1 className="mb-8 text-2xl font-semibold text-slate-900">New Prototype Test</h1>
      <NewTestForm />
    </main>
  );
}
