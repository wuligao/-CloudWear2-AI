import { AppShell } from "@/components/outfit/app-shell";
import { H5ChatPage } from "@/components/outfit/h5-chat-page";
import { RequireH5Auth } from "@/components/outfit/require-h5-auth";

export default function Chat() {
  return (
    <AppShell hideTopHeader contentClassName="app-main-chat">
      <RequireH5Auth>
        <H5ChatPage />
      </RequireH5Auth>
    </AppShell>
  );
}
