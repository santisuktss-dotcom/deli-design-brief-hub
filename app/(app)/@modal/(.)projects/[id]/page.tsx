import RouteModal from '@/components/RouteModal';
import ProjectDetailContent from '@/components/ProjectDetailContent';

// Intercepts client-side navigation to /projects/[id] (e.g. clicking a chip on the
// calendar) and shows it as a modal instead of a full page — a direct link, refresh, or
// hard navigation still renders the real app/(app)/projects/[id]/page.tsx untouched.
export default async function ProjectModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <RouteModal>
      <ProjectDetailContent id={id} compact />
    </RouteModal>
  );
}
