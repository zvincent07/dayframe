import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy | Dayframe",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-8 -ml-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>
          <p><strong>Last Updated:</strong> April 6, 2026</p>
          
          <p>
            Welcome to Dayframe. We take your privacy seriously. This Privacy Policy 
            explains how Dayframe operates regarding your personal data.
          </p>

          <h2>1. Local-First & Self-Hosted Design</h2>
          <p>
            Dayframe is designed as a local-first, self-hosted application. This means:
          </p>
          <ul>
            <li><strong>Data Storage:</strong> All your data (journal entries, photos, metadata) is stored in the database configured in your environment (e.g., your local MongoDB instance).</li>
            <li><strong>No Telemetry:</strong> The application does not send analytics, usage data, or telemetry to any central server owned by the developers.</li>
            <li><strong>Complete Control:</strong> You have full control over your database, backups, and retention policies.</li>
          </ul>

          <h2>2. Data You Provide</h2>
          <p>
            When you use your instance of Dayframe, the application processes:
          </p>
          <ul>
            <li><strong>Account Information:</strong> Email addresses and hashed passwords used to authenticate to your instance.</li>
            <li><strong>Content:</strong> Any journal entries, images, and text you upload.</li>
            <li><strong>Third-Party Integrations:</strong> If you configure OAuth (e.g., Google) or Email providers (e.g., Resend), the application will securely interact with those services using your provided credentials.</li>
          </ul>

          <h2>3. Cookies and Authentication</h2>
          <p>
            Dayframe uses secure, HTTP-only cookies to maintain your login session. These are required for the application to function and are only used for authentication and authorization within your instance.
          </p>

          <h2>4. Third-Party Services</h2>
          <p>
            Your instance may interact with third-party services depending on your configuration (e.g., Google OAuth, Resend). Please review the privacy policies of those specific providers, as your data will be subject to their terms when interacting with their APIs.
          </p>

          <h2>5. Contact</h2>
          <p>
            If you have questions about the core open-source software, please open an issue on the official project repository. If you are using a hosted instance managed by a third party, please contact your instance administrator.
          </p>
        </article>
      </div>
    </div>
  );
}
