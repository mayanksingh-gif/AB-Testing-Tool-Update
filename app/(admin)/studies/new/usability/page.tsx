import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import UsabilityStudyForm from "@/components/UsabilityStudyForm";

export default function NewUsabilityStudyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        Back to home
      </Link>
      <h1 className="mb-8 text-2xl font-semibold text-slate-900">New Usability Study</h1>
      <UsabilityStudyForm />
    </main>
  );
}
