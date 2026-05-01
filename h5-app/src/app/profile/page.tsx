import { AppShell } from "@/components/outfit/app-shell";
import { ProfilePage } from "@/components/outfit/profile-page";
import { RequireH5Auth } from "@/components/outfit/require-h5-auth";

export default function Profile() {
  return (
    <AppShell hideTopHeader>
      <RequireH5Auth>
        <ProfilePage />
      </RequireH5Auth>
    </AppShell>
  );
}
