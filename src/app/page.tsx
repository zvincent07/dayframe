import { AuthTabs } from "@/components/auth/auth-tabs";
import { ModeToggle } from "@/components/mode-toggle";
import { GoogleButton } from "@/components/auth/google-button";
import { SettingsService } from "@/services/settings.service";
import Image from "next/image";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/permissions";
import { cookies } from "next/headers";

// Simple Book Icon SVG
function BookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    if (hasPermission(session.user, "view:settings")) redirect("/admin/dashboard");
    if (hasPermission(session.user, "view:assigned-journal")) redirect("/mentor");
    const cookieStore = await cookies();
    const defaultStartPage = cookieStore.get("df_default_start_page")?.value;
    if (defaultStartPage === "dashboard") {
      redirect("/user/dashboard");
    } else {
      redirect("/user/today");
    }
  }

  const config = await SettingsService.getSystemConfig();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 md:p-8">
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-card shadow-lg md:flex-row md:h-[85vh]">
        
        {/* Left Side: Login Form */}
        <div className="flex w-full flex-col md:w-1/2 overflow-y-auto">
          {/* Mobile Theme Toggle */}
          <div className="flex w-full justify-end p-6 md:hidden">
            <ModeToggle />
          </div>

          <div className="flex flex-1 flex-col justify-center px-4 pb-8 md:p-12 lg:p-16">
            <div className="mx-auto w-full max-w-sm space-y-6">
              {/* Mobile Branding */}
              <div className="flex flex-col items-center space-y-2 md:hidden mb-6">
                {config.logoUrl ? (
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-background/50 p-1">
                    <Image 
                      src={config.logoUrl} 
                      alt={config.appName} 
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl bg-primary/10 p-3">
                    <BookIcon className="h-6 w-6 text-primary" strokeWidth={2} />
                  </div>
                )}
                <h1 className="text-xl font-bold tracking-tight text-foreground">{config.appName}</h1>
              </div>

              <AuthTabs 
                allowPublicRegistration={config.allowPublicRegistration} 
                emailVerificationRequired={config.emailVerificationRequired}
              />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted-foreground/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground/80 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            <GoogleButton />
            <p className="px-8 text-center text-sm text-muted-foreground/80">
              By clicking continue, you agree to our{" "}
              <a href="#" className="underline underline-offset-4 hover:text-primary font-medium text-foreground/80 hover:text-foreground">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline underline-offset-4 hover:text-primary font-medium text-foreground/80 hover:text-foreground">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
        </div>

        {/* Right Side: Hero Area */}
        <div className="relative hidden w-full flex-col items-center justify-center overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 p-8 md:flex md:w-1/2 lg:p-12">
          {/* Theme Toggle - Option B */}
          <div className="absolute top-4 right-4 z-20">
            <ModeToggle />
          </div>

          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center space-y-6 text-center max-w-sm">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
              {config.logoUrl ? (
                <div className="relative h-12 w-12">
                  <Image 
                    src={config.logoUrl} 
                    alt={config.appName} 
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <BookIcon className="h-12 w-12 text-primary/80" strokeWidth={1.5} />
              )}
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{config.appName}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {config.appDescription}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
