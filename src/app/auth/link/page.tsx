import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { AutoSubmit } from "./auto-submit";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function ElectronLinkPage({ searchParams }: Props) {
  const params = await searchParams;
  const code = params.code;
  if (!code) return redirect("/login");

  async function startGoogleSignIn() {
    "use server";
    await signIn("google", {
      redirectTo: `/auth/link/done?code=${code}`,
    });
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm px-4">
        <h1 className="text-xl font-bold text-foreground">Redirecting to Google...</h1>
        <p className="text-sm text-muted-foreground">Please wait...</p>
        <form action={startGoogleSignIn}>
          <AutoSubmit />
        </form>
      </div>
    </div>
  );
}
