import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";

export const metadata = {
  title: "Terms of Service | Dayframe",
};

export default function TermsPage() {
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
                <h1 className="tracking-tight text-foreground mb-2">Terms of Service</h1>
                <p className="text-muted-foreground mt-0"><strong>Last Updated:</strong> April 6, 2026</p>
              </div>

              <div className="my-8 h-px bg-border" />

              <p className="text-foreground/90 leading-relaxed">
                Welcome to Dayframe. By using the Dayframe application ("Service", "App", or "Software"), 
                you agree to be bound by the following terms and conditions.
              </p>

          <h2 className="text-foreground">1. Description of Service</h2>
          <p className="text-foreground/90 leading-relaxed">
            Dayframe is a full-stack, self-hosted journaling and productivity application provided as 
            an open-source or source-available software package. The Service includes a web application 
            backend built with Next.js and a desktop client packaged via Tauri.
          </p>

          <h2 className="text-foreground mt-8">2. Local-First and Self-Hosting</h2>
          <p className="text-foreground/90 leading-relaxed">
            By design, Dayframe is intended to be run locally or self-hosted by the user.
          </p>
          <ul className="text-foreground/90 leading-relaxed marker:text-muted-foreground space-y-2">
            <li><strong className="text-foreground">Data Ownership:</strong> All data, including journal entries, images, and user accounts, is stored in your designated MongoDB database. We do not have access to your data, nor do we collect telemetry or personal information from your self-hosted instance.</li>
            <li><strong className="text-foreground">Responsibility:</strong> You are solely responsible for securing your database, maintaining your server daemon, configuring rate limiting (via Redis), and securing your environment variables (including Auth secrets).</li>
          </ul>

          <h2 className="text-foreground mt-8">3. License and Acceptable Use</h2>
          <p className="text-foreground/90 leading-relaxed">
            You are granted a limited, non-exclusive, non-transferable license to use the Software for personal or internal business purposes, subject to the codebase's associated license. You agree NOT to:
          </p>
          <ul className="text-foreground/90 leading-relaxed marker:text-muted-foreground space-y-2">
            <li>Use the Software for any illegal or unauthorized purpose.</li>
            <li>Attempt to exploit or bypass the security mechanisms of the Software.</li>
            <li>Resell or redistribute the Software without explicit authorization.</li>
          </ul>

          <h2 className="text-foreground mt-8">4. Third-Party Services</h2>
          <p className="text-foreground/90 leading-relaxed">
            Dayframe integrates with third-party services (e.g., Google OAuth, Resend for emails). Your use of these services is subject to their respective Terms of Service and Privacy Policies. You are responsible for managing your API keys and quotas for these third-party providers.
          </p>

          <h2 className="text-foreground mt-8">5. Disclaimer of Warranties</h2>
          <div className="bg-muted/50 p-6 rounded-lg border border-border mt-4">
            <p className="text-muted-foreground text-sm uppercase tracking-wider font-semibold mb-2">Disclaimer</p>
            <p className="text-foreground/80 text-sm leading-relaxed m-0 font-mono">
              THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </div>

          <h2 className="text-foreground mt-8">6. Modifications to Terms</h2>
          <p className="text-foreground/90 leading-relaxed">
            We reserve the right to modify these terms at any time. Significant changes will be communicated via the project's repository. Continued use of the Software after changes constitutes acceptance of the new terms.
          </p>

          <h2 className="text-foreground mt-8">7. Contact</h2>
          <p className="text-foreground/90 leading-relaxed">
            For any questions regarding these terms, please open an issue on the official project repository.
          </p>
        </article>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
