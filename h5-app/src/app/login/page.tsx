import { AppShell } from "@/components/outfit/app-shell";
import { LoginPage } from "@/components/outfit/login-page";

export default function Login() {
  return (
    <AppShell hideHeader>
      <LoginPage />
    </AppShell>
  );
}
