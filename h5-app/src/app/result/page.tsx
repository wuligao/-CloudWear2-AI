import { AppShell } from "@/components/outfit/app-shell";
import { OutfitResultPage } from "@/components/outfit/outfit-result-page";
import { RequireH5Auth } from "@/components/outfit/require-h5-auth";

export default function Result() {
  return (
    <AppShell hideHeader>
      <RequireH5Auth>
        <OutfitResultPage />
      </RequireH5Auth>
    </AppShell>
  );
}
