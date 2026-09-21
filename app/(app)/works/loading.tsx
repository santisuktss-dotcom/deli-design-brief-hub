export default function Loading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex items-baseline justify-between">
        <div className="h-8 w-40 rounded-lg bg-black/[.06]" />
        <div className="h-4 w-20 rounded bg-black/[.06]" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-black/[.06]" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-black/[.06] h-[260px]" />
        ))}
      </div>
    </div>
  );
}
