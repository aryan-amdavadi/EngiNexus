import Dashboard from "../ui/dashboard";

export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  return <Dashboard initialPage={page} />;
}
