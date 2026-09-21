export default function Loading() {
  return (
    <div className="flex flex-col items-center gap-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-black/[.06]" />
      <div className="h-4 w-64 rounded bg-black/[.06]" />
      <div className="h-9 w-40 rounded-2xl bg-black/[.06]" />
      <div className="w-full rounded-[20px] border border-black/[.08] bg-white p-5">
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="min-h-[110px] rounded-2xl bg-black/[.05]" />
          ))}
        </div>
      </div>
    </div>
  );
}
