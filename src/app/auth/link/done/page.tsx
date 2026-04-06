import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function ElectronLinkDonePage({ searchParams }: Props) {
  const params = await searchParams;
  const code = params.code;
  if (!code) return redirect("/login");

  const session = await auth();
  if (!session?.user) return redirect("/login");

  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-authjs.session-token")?.value;

  if (sessionToken) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await fetch(`${baseUrl}/api/v1/electron-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `authjs.session-token=${sessionToken}`,
      },
      body: JSON.stringify({ action: "complete", code }),
    });
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm px-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Signed in!</h1>
        <p className="text-muted-foreground">
          You can close this tab and return to the Dayframe desktop app.
        </p>
      </div>
    </div>
  );
}
