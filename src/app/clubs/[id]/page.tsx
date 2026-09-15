import ClubDetailClient from "./ClubDetailClient";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function ClubDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ClubDetailClient id={id} />;
}
