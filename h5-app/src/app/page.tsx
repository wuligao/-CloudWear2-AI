import { AppShell } from "@/components/outfit/app-shell";
import { CloudWearApp } from "@/components/outfit/cloudwear-app";
import { RequireH5Auth } from "@/components/outfit/require-h5-auth";

type HomeProps = {
  searchParams?: Promise<{
    screen?: string;
    taskId?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const initialScreen =
    params?.screen === "photo" || params?.screen === "keyword"
      ? params.screen
      : params?.taskId
        ? "keyword"
      : "home";

  return (
    <AppShell hideHeader>
      <RequireH5Auth>
        <CloudWearApp initialScreen={initialScreen} />
      </RequireH5Auth>
    </AppShell>
  );
}
