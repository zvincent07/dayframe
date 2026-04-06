import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserShell } from "@/components/dashboard/user-shell";
import { UserRepository } from "@/repositories/user.repository";
import { TimezoneSyncer } from "@/components/dashboard/timezone-syncer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const dbUser = await UserRepository.findById(session.user.id);
  const serverTimezone = dbUser?.timezone || "UTC";

  return (
    <>
      <TimezoneSyncer serverTimezone={serverTimezone} />
      <UserShell user={session.user}>
        {children}
      </UserShell>
    </>
  );
}
