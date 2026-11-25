export function FullPageSpinner() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center bg-slate-950">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
