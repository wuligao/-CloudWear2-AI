import { AppShell } from "@/components/outfit/app-shell";
import { ProfileSettingsPage } from "@/components/outfit/profile-settings-page";
import { RequireH5Auth } from "@/components/outfit/require-h5-auth";

export default function ProfileAccount() {
  return (
    <AppShell hideBottomNav hideTopHeader>
      <RequireH5Auth>
        <ProfileSettingsPage />
      </RequireH5Auth>
    </AppShell>
  );
}
