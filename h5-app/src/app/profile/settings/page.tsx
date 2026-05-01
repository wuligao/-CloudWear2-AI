import { AppShell } from "@/components/outfit/app-shell";
import { MinePage } from "@/components/outfit/mine-page";
import { RequireH5Auth } from "@/components/outfit/require-h5-auth";

export default function ProfileSettings() {
  return (
    <AppShell hideTopHeader>
      <RequireH5Auth>
        <MinePage />
      </RequireH5Auth>
    </AppShell>
  );
}
