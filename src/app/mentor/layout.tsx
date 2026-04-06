import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/permissions";

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || !hasPermission(session.user, "view:assigned-journal")) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <a className="mr-6 flex items-center space-x-2" href="/mentor">
              <span className="hidden font-bold sm:inline-block">Dayframe Mentor</span>
            </a>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6">
        {children}
      </main>
    </div>
  );
}
