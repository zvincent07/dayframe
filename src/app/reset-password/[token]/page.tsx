"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState, useState, use } from "react";
import { resetPassword } from "@/actions/auth";
import { toast } from "sonner";
import { useEffect } from "react";

import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

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

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  // Pass token via hidden input, no need to bind
  const [state, action, isPending] = useActionState(resetPassword, undefined);
  
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error, {
        position: "top-center",
        duration: 5000,
      });
    }
    if (state?.success) {
      toast.success(state.success, {
        position: "top-center",
        duration: 5000,
      });
    }
  }, [state?.error, state?.success]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4 md:p-8">
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border bg-card shadow-lg md:flex-row">
        
        {/* Left Side: Form */}
        <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-12 lg:p-16">
          <div className="mx-auto w-full max-w-sm space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Set New Password</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create a strong password to secure your account.
              </p>
            </div>

            {state?.success ? (
              <div className="flex flex-col items-center justify-center space-y-4 rounded-lg bg-green-50 p-6 text-center text-green-900 dark:bg-green-900/20 dark:text-green-200 border border-green-200 dark:border-green-800">
                <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/40">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Password Reset Complete</h3>
                  <p className="text-sm opacity-90">{state.success}</p>
                </div>
                <Button asChild className="w-full mt-4">
                  <Link href="/">
                    Proceed to Login
                  </Link>
                </Button>
              </div>
            ) : (
              <form action={action} className="space-y-5">
                <div className="space-y-1.5">
                  <input type="hidden" name="token" value={token} />
                  <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="bg-white border-slate-300 dark:border-slate-700 px-4 pr-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
                      )}
                      <span className="sr-only">Toggle password visibility</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="bg-white border-slate-300 dark:border-slate-700 px-4 pr-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
                      )}
                      <span className="sr-only">Toggle password visibility</span>
                    </Button>
                  </div>
                  {/* Error toast handles display */}
                </div>

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            )}

            <div className="text-center text-sm">
              <Link href="/" className="font-medium text-primary hover:underline underline-offset-4">
                Back to Login
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Hero Area */}
        <div className="relative hidden w-full flex-col items-center justify-center overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 p-8 md:flex md:w-1/2 lg:p-12">
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center space-y-6 text-center max-w-sm">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10">
              <BookIcon className="h-12 w-12 text-primary/80" strokeWidth={1.5} />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Secure & Private</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your journal is your safe space. We use industry-standard encryption to keep your data protected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
