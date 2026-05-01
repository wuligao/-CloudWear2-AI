import { AppShell } from "@/components/outfit/app-shell";
import { StyleProfileArchivePage } from "@/components/outfit/style-profile-archive-page";
import { RequireH5Auth } from "@/components/outfit/require-h5-auth";

export default function ProfileArchive() {
  return (
    <AppShell hideBottomNav hideTopHeader>
      <RequireH5Auth>
        <StyleProfileArchivePage />
      </RequireH5Auth>
    </AppShell>
  );
}
