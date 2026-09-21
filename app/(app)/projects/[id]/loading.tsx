export default function Loading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="rounded-2xl bg-black/[.06] h-[240px]" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-black/[.06] h-[140px]" />
          <div className="rounded-2xl bg-black/[.06] h-[180px]" />
          <div className="rounded-2xl bg-black/[.06] h-[140px]" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-black/[.06] h-[220px]" />
          <div className="rounded-2xl bg-black/[.06] h-[100px]" />
        </div>
      </div>
    </div>
  );
}
