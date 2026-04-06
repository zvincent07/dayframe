import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";

export const metadata = {
  title: "Privacy Policy | Dayframe",
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center bg-muted/30 px-4 py-12 sm:px-6 md:p-8">
      <div className="absolute top-4 right-4 z-20">
        <ModeToggle />
      </div>

      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Button variant="ghost" asChild className="mb-2 -ml-4 hover:bg-transparent">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-8 sm:p-12">
            <article className="prose prose-slate dark:prose-invert prose-headings:font-semibold prose-a:text-primary hover:prose-a:text-primary/80 max-w-none">
              <div className="mb-8">
                <h1 className="tracking-tight text-foreground mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground mt-0"><strong>Last Updated:</strong> April 6, 2026</p>
              </div>
              
              <div className="my-8 h-px bg-border" />

              <p className="text-foreground/90 leading-relaxed">
                Welcome to Dayframe. We take your privacy seriously. This Privacy Policy 
                explains how Dayframe operates regarding your personal data.
              </p>

          <h2 className="text-foreground mt-8">1. Local-First & Self-Hosted Design</h2>
          <p className="text-foreground/90 leading-relaxed">
            Dayframe is designed as a local-first, self-hosted application. This means:
          </p>
          <ul className="text-foreground/90 leading-relaxed marker:text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Data Storage:</strong> All your data (journal entries, photos, metadata) is stored in the database configured in your environment (e.g., your local MongoDB instance).</li>
            <li><strong className="text-foreground">No Telemetry:</strong> The application does not send analytics, usage data, or telemetry to any central server owned by the developers.</li>
            <li><strong className="text-foreground">Complete Control:</strong> You have full control over your database, backups, and retention policies.</li>
          </ul>

          <h2 className="text-foreground mt-8">2. Data You Provide</h2>
          <p className="text-foreground/90 leading-relaxed">
            When you use your instance of Dayframe, the application processes:
          </p>
          <ul className="text-foreground/90 leading-relaxed marker:text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Account Information:</strong> Email addresses and hashed passwords used to authenticate to your instance.</li>
            <li><strong className="text-foreground">Content:</strong> Any journal entries, images, and text you upload.</li>
            <li><strong className="text-foreground">Third-Party Integrations:</strong> If you configure OAuth (e.g., Google) or Email providers (e.g., Resend), the application will securely interact with those services using your provided credentials.</li>
          </ul>

          <h2 className="text-foreground mt-8">3. Cookies and Authentication</h2>
          <p className="text-foreground/90 leading-relaxed">
            Dayframe uses secure, HTTP-only cookies to maintain your login session. These are required for the application to function and are only used for authentication and authorization within your instance.
          </p>

          <h2 className="text-foreground mt-8">4. Third-Party Services</h2>
          <p className="text-foreground/90 leading-relaxed">
            Your instance may interact with third-party services depending on your configuration (e.g., Google OAuth, Resend). Please review the privacy policies of those specific providers, as your data will be subject to their terms when interacting with their APIs.
          </p>

          <h2 className="text-foreground mt-8">5. Contact</h2>
          <p className="text-foreground/90 leading-relaxed">
            If you have questions about the core open-source software, please open an issue on the official project repository. If you are using a hosted instance managed by a third party, please contact your instance administrator.
          </p>
            </article>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
