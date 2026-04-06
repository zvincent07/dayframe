import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { PreferencesForm } from "./preferences-form"
import { UserRepository } from "@/repositories/user.repository"

export default async function UserSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const userId = session.user.id;
  if (typeof userId !== "string") redirect("/login");
  const user = await UserRepository.findById(userId);

  return (
    <div className="w-full space-y-6">
      <PageHeader title="Preferences" description="Customize your app environment, formatting, and behavior." />
      <PreferencesForm
        initialUnits={user?.preferredUnits ?? "metric"}
        initialCurrency={user?.preferredCurrency ?? "USD"}
        initialFirstDay={user?.firstDayOfWeek ?? "sunday"}
      />
    </div>
  )
}
