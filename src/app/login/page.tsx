import { AuthTabs } from "@/components/auth/auth-tabs";
import { ModeToggle } from "@/components/mode-toggle";
import { GoogleSection } from "@/components/auth/google-section";
import { SettingsService } from "@/services/settings.service";
import Image from "next/image";

export const dynamic = 'force-dynamic';
// export const revalidate = 0; // Force no cache for this page

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
  const config = await SettingsService.getSystemConfig();

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] sm:px-6 md:p-8">
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-card shadow-lg md:flex-row">
        
        {/* Left Side: Login Form */}
        <div className="flex w-full flex-col md:w-1/2">
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

            <GoogleSection />
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
        <div className="relative hidden w-full flex-col items-center justify-center overflow-hidden bg-muted/50 p-8 md:flex md:w-1/2 lg:p-12">
          {/* Theme Toggle - Option B */}
          <div className="absolute top-4 right-4 z-20">
            <ModeToggle />
          </div>

          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center space-y-6 text-center max-w-sm">
            <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border">
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
                {config.appDescription || "Capture your day, track your habits, and grow with mentorship. Your personal space for reflection and progress."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
