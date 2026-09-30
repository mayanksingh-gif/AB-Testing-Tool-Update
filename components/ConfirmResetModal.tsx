"use client";

// A small, dependency-free confirmation modal used only by the edit-test
// flow (NewTestForm, in edit mode). Matches the app's existing visual
// language (rounded-lg/xl white cards with border-slate-200 + shadow-xl,
// slate-900/slate-700 for the primary action) rather than introducing a new
// pattern. No portal/focus-trap library — a plain fixed overlay is enough
// for this app's scope.
export default function ConfirmResetModal({
  open,
  onCancel,
  onConfirm,
  confirming,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirming: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">Editing this test will reset its results</h2>
        <p className="mt-2 text-sm text-slate-600">
          Changing the test configuration will permanently delete all data collected using the previous
          configuration.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {confirming ? "Saving…" : "Save & Reset Results"}
          </button>
        </div>
      </div>
    </div>
  );
}
