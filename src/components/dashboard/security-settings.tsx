"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ShieldCheck, ShieldOff, Eye, EyeOff, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  changePassword,
  get2FAStatus,
  setup2FA,
  verify2FASetup,
  disable2FA,
} from "@/actions/security";

export function SecuritySettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <ChangePasswordSection />
      <TwoFactorSection />
    </div>
  );
}

function ChangePasswordSection() {
  const [isPending, startTransition] = useTransition();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await changePassword(form);
      if (result.success) {
        toast.success("Password updated successfully");
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(result.error || "Failed to update password");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change Password</CardTitle>
        <CardDescription>Update your password to keep your account secure.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={form.currentPassword}
                onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                autoComplete="new-password"
                placeholder="At least 8 characters"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" disabled={isPending || !form.currentPassword || !form.newPassword || !form.confirmPassword}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TwoFactorSection() {
  const [status, setStatus] = useState<{ enabled: boolean; hasPassword: boolean } | null>(null);
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "backup" | "disable">("idle");
  const [qrData, setQrData] = useState<{ qrDataUrl: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    get2FAStatus().then(setStatus);
  }, []);

  const handleSetup = () => {
    startTransition(async () => {
      const result = await setup2FA();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setQrData({ qrDataUrl: result.qrDataUrl!, secret: result.secret! });
      setStep("setup");
    });
  };

  const handleVerify = () => {
    startTransition(async () => {
      const result = await verify2FASetup({ token: verifyCode });
      if (result.success && result.backupCodes) {
        setBackupCodes(result.backupCodes);
        setStep("backup");
        setStatus((s) => (s ? { ...s, enabled: true } : s));
        toast.success("Two-factor authentication enabled");
      } else {
        toast.error(result.error || "Invalid code");
      }
    });
  };

  const handleDisable = () => {
    startTransition(async () => {
      const result = await disable2FA(disablePassword);
      if (result.success) {
        setStatus((s) => (s ? { ...s, enabled: false } : s));
        setStep("idle");
        setDisablePassword("");
        toast.success("Two-factor authentication disabled");
      } else {
        toast.error(result.error || "Failed to disable 2FA");
      }
    });
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {status?.enabled ? (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          ) : (
            <Shield className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
            <CardDescription>
              {status?.enabled
                ? "Your account is protected with 2FA."
                : "Add an extra layer of security to your account."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Loading state */
        !status && (
          <Button disabled variant="outline">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground hidden sm:inline">Checking status...</span>
          </Button>
        )}

        {/* Idle — show enable/disable button */}
        {status && step === "idle" && (
          <div className="space-y-4">
            {status.enabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Enabled</span>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setStep("disable")}>
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Disable 2FA
                </Button>
              </div>
            ) : (
              <Button onClick={handleSetup} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Shield className="mr-2 h-4 w-4" />
                Enable 2FA
              </Button>
            )}
          </div>
        )}

        {/* Setup — show QR code */}
        {step === "setup" && qrData && (
          <div className="space-y-4 max-w-sm">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).
            </p>
            <div className="flex justify-center bg-white rounded-lg p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrData.qrDataUrl} alt="2FA QR Code" className="w-48 h-48" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Or enter this code manually:</p>
              <code className="block text-xs bg-muted px-3 py-2 rounded font-mono break-all select-all">
                {qrData.secret}
              </code>
            </div>
            <div className="space-y-2">
              <Label>Enter the 6-digit code from your app</Label>
              <Input
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="font-mono text-center text-lg tracking-widest max-w-[200px]"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleVerify} disabled={verifyCode.length !== 6 || isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Enable
              </Button>
              <Button variant="ghost" onClick={() => { setStep("idle"); setVerifyCode(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Backup codes — show after successful setup */}
        {step === "backup" && (
          <div className="space-y-4 max-w-sm">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-sm font-medium text-amber-500 mb-1">Save your backup codes</p>
              <p className="text-xs text-muted-foreground">
                Store these codes in a safe place. Each code can only be used once.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code) => (
                <code key={code} className="text-xs bg-muted px-3 py-2 rounded font-mono text-center">
                  {code}
                </code>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyBackupCodes}>
                {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy codes"}
              </Button>
              <Button size="sm" onClick={() => setStep("idle")}>
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Disable confirmation */}
        {step === "disable" && (
          <div className="space-y-4 max-w-sm">
            <p className="text-sm text-muted-foreground">
              Enter your password to confirm disabling two-factor authentication.
            </p>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={handleDisable} disabled={!disablePassword || isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Disable 2FA
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setStep("idle"); setDisablePassword(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
