import Board from '@/components/Board';

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Care Budget</h1>
          <p className="text-sm text-ink-soft">Demo family caring for a parent</p>
        </div>
        <span className="chip border-brand/40 bg-brand-tint text-brand">Sample data - demo</span>
      </header>
      <Board />
      <footer className="mt-10 border-t border-hair pt-4 text-xs text-ink-faint">
        Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Cova.
      </footer>
    </div>
  );
}
