import ProjectDetailContent from '@/components/ProjectDetailContent';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetailContent id={id} />;
}
