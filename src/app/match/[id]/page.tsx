import MatchDetailClient from "./MatchDetailClient";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function MatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <MatchDetailClient id={id} />;
}