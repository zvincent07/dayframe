import { AuthService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  // Ensure token is decoded correctly if passed via URL
  const decodedToken = decodeURIComponent(token);
  
  const result = await AuthService.verifyEmail(decodedToken);
  const success = !!result.success;
  const error = result.error;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-lg text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`rounded-full p-3 ${success ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
            {success ? (
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight">
            {success ? "Email Verified!" : "Verification Failed"}
          </h1>
          
          <p className="text-muted-foreground">
            {success 
              ? "Your email has been successfully verified. You can now log in to your account." 
              : error || "The verification link is invalid or has expired."}
          </p>

          <Button asChild className="w-full mt-4">
            <Link href="/">
              {success ? "Continue to Login" : "Back to Login"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
