import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserOverview } from "@/components/dashboard/user-overview";
import { SecretService } from "@/services/secret.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UserDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const [groq, gemini] = await Promise.all([
    SecretService.getMasked(session.user.id!, "groq"),
    SecretService.getMasked(session.user.id!, "gemini"),
  ]);
  return (
    <div className="space-y-6">
      <UserOverview initialGroqKey={groq} initialGeminiKey={gemini} />
    </div>
  );
}
