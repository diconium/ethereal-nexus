import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectUsersPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  const sectionParam = Array.isArray(query?.section)
    ? query?.section[0]
    : query?.section;
  const targetSection =
    sectionParam && sectionParam.length > 0 ? sectionParam : 'members';

  redirect(`/projects/${id}/settings?section=${targetSection}`);
}
