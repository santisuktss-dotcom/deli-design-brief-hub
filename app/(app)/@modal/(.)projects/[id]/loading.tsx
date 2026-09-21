import RouteModal from '@/components/RouteModal';

export default function Loading() {
  return (
    <RouteModal>
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="rounded-2xl bg-black/[.06] h-[160px]" />
        <div className="rounded-2xl bg-black/[.06] h-[120px]" />
        <div className="rounded-2xl bg-black/[.06] h-[160px]" />
        <div className="rounded-2xl bg-black/[.06] h-[100px]" />
      </div>
    </RouteModal>
  );
}
