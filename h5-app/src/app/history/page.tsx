import { AppShell } from "@/components/outfit/app-shell";
import { HistoryPage } from "@/components/outfit/history-page";
import { RequireH5Auth } from "@/components/outfit/require-h5-auth";
import type { OutfitRecordStatusFilter } from "@/types/outfit";

interface HistoryProps {
  searchParams?: Promise<{
    status?: string;
  }>;
}

export default async function History({ searchParams }: HistoryProps) {
  const params = await searchParams;

  return (
    <AppShell hideTopHeader>
      <RequireH5Auth>
        <HistoryPage initialStatus={normalizeStatusFilter(params?.status)} />
      </RequireH5Auth>
    </AppShell>
  );
}

function normalizeStatusFilter(value: string | undefined): OutfitRecordStatusFilter {
  if (
    value === "running" ||
    value === "succeeded" ||
    value === "failed" ||
    value === "all"
  ) {
    return value;
  }

  return "all";
}
