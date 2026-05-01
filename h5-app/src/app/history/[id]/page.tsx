import { AppShell } from "@/components/outfit/app-shell";
import { HistoryDetail } from "@/components/outfit/history-detail";
import { RequireH5Auth } from "@/components/outfit/require-h5-auth";

interface HistoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function HistoryDetailPage({
  params,
}: HistoryDetailPageProps) {
  const { id } = await params;

  return (
    <AppShell hideHeader>
      <RequireH5Auth>
        <HistoryDetail id={id} />
      </RequireH5Auth>
    </AppShell>
  );
}
