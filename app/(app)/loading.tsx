// Shown instantly by Next.js while OverviewPage's data resolves, instead of leaving the
// screen blank during navigation — this is what actually makes the app feel instant, since
// the query itself still takes the same time either way.
export default function Loading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="rounded-[20px] bg-black/[.06] h-[180px]" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-black/[.06] h-[160px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-black/[.06] h-[160px]" />
        <div className="rounded-2xl bg-black/[.06] h-[160px]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-black/[.06] h-[220px]" />
        ))}
      </div>
    </div>
  );
}
