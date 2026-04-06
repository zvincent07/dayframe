"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { login, signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const inputClassName = "bg-muted/50 focus-visible:bg-muted/70";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Please wait..." : children}
    </Button>
  );
}

export function AuthTabs({ 
  allowPublicRegistration = true, 
  emailVerificationRequired = false 
}: { 
  allowPublicRegistration?: boolean;
  emailVerificationRequired?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [savedFormData, setSavedFormData] = useState<FormData | null>(null);

  async function handleLogin(formData: FormData) {
    try {
      const error = await login(undefined, formData);
      if (error === "2FA_REQUIRED") {
        setSavedFormData(formData);
        setNeeds2FA(true);
        return;
      }
      if (error) {
        toast.error(error, { duration: 10000, position: "top-center" });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  async function handle2FASubmit(formData: FormData) {
    if (!savedFormData) return;
    const totp = formData.get("totp") as string;
    savedFormData.set("totp", totp);
    try {
      const error = await login(undefined, savedFormData);
      if (error) {
        toast.error(error, { duration: 10000, position: "top-center" });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  async function handleSignUp(formData: FormData) {
    const result = await signUp(formData);
    if (result && 'error' in result) {
      if (typeof result.error === "string") {
        toast.error(result.error, {
          duration: 10000,
          position: "top-center",
        });
      } else if (result.error) {
        // Handle field errors if needed, for now just show general error or first field error
        const firstError = Object.values(result.error)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : "Sign up failed", {
          duration: 10000,
          position: "top-center",
        });
      }
    } else if (result && 'success' in result) {
      if (emailVerificationRequired) {
        toast.success("Account created! Please check your email to verify your account.", {
          duration: 10000,
          position: "top-center",
        });
        // Switch to login tab but do not auto-login
        setActiveTab("login");
      } else {
        toast.success("Account created successfully!", {
          duration: 5000,
          position: "top-center",
        });
        // Auto login after signup
        await handleLogin(formData);
      }
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="grid h-9 w-full grid-cols-2 bg-muted/40 sm:h-10 border border-border/60">
          <TabsTrigger value="login" id="tab-login" className="px-2 text-xs sm:px-5 sm:text-sm">Login</TabsTrigger>
          {allowPublicRegistration && (
            <TabsTrigger value="signup" id="tab-signup" className="px-2 text-xs sm:px-5 sm:text-sm">Sign Up</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="login" id="content-login">
          {needs2FA ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Two-Factor Authentication</h1>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              <form action={handle2FASubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="totp">Authentication Code</Label>
                  <Input
                    id="totp"
                    name="totp"
                    placeholder="000000"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    required
                    autoFocus
                    className={`font-mono text-center text-lg tracking-widest ${inputClassName}`}
                  />
                  <p className="text-xs text-muted-foreground">You can also use a backup code.</p>
                </div>
                <SubmitButton>Verify</SubmitButton>
                <Button type="button" variant="ghost" className="w-full" onClick={() => { setNeeds2FA(false); setSavedFormData(null); }}>
                  Back to login
                </Button>
              </form>
            </div>
          ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="text-sm text-muted-foreground">
                Enter your username or email to sign in to your account
              </p>
            </div>

            <form action={handleLogin} className="space-y-5" autoComplete="off">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium">Username or Email</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="johndoe or john@example.com"
                  type="text"
                  required
                  autoComplete="off"
                  className={inputClassName}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="off"
                    className={`pr-10 ${inputClassName}`}
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
                      <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    )}
                    <span className="sr-only">Toggle password visibility</span>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                {/* <div className="flex items-center space-x-2">
                  <Checkbox id="remember" name="remember" className="border-slate-400 dark:border-slate-500 data-[state=checked]:border-primary" />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Remember me
                  </label>
                </div> */}
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline ml-auto"
                >
                  Forgot password?
                </Link>
              </div>
              <SubmitButton>Sign in</SubmitButton>
            </form>
          </div>
          )}
        </TabsContent>
        
        {allowPublicRegistration && (
        <TabsContent value="signup" id="content-signup">
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
              <p className="text-sm text-muted-foreground">
                Enter your details to create your account
              </p>
            </div>

            <form action={handleSignUp} className="space-y-5" autoComplete="off">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="signup-name"
                  name="name"
                  placeholder="John Doe"
                  type="text"
                  required
                  autoComplete="off"
                  className={inputClassName}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-username" className="text-sm font-medium">Username</Label>
                <Input
                  id="signup-username"
                  name="username"
                  placeholder="johndoe"
                  type="text"
                  required
                  autoComplete="off"
                  className={inputClassName}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                <Input
                  id="signup-email"
                  name="email"
                  placeholder="john@example.com"
                  type="email"
                  required
                  autoComplete="off"
                  className={inputClassName}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    name="password"
                    type={showSignupPassword ? "text" : "password"}
                    required
                    autoComplete="off"
                    className={`pr-10 ${inputClassName}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                  >
                    {showSignupPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <SubmitButton>Sign Up</SubmitButton>
            </form>
          </div>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
