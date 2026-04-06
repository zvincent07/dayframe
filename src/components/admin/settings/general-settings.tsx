"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateSystemConfig, clearCache, resetDatabase } from "@/app/admin/settings/actions";
import { uploadLogo, removeLogo, deleteLogoFile } from "@/app/admin/settings/upload";
import { useState, useRef, useTransition } from "react";
import { Loader2, AlertTriangle, Trash2, RefreshCw, Upload } from "lucide-react";
import { SystemConfig } from "@/types/settings";
import { systemConfigSchema } from "@/schemas/settings";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Form schema without logoUrl as it's handled separately with file upload logic
const formSchema = systemConfigSchema.omit({ logoUrl: true });

interface GeneralSettingsProps {
  initialConfig: SystemConfig;
}

export function GeneralSettings({ initialConfig }: GeneralSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isResettingDB, setIsResettingDB] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(initialConfig.logoUrl);
  const [pendingLogo, setPendingLogo] = useState<File | null>(null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [showResetDBDialog, setShowResetDBDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appName: initialConfig.appName,
      appDescription: initialConfig.appDescription,
      supportEmail: initialConfig.supportEmail,
      maintenanceMode: initialConfig.maintenanceMode,
      maintenanceMessage: initialConfig.maintenanceMessage,
      allowPublicRegistration: initialConfig.allowPublicRegistration,
      emailVerificationRequired: initialConfig.emailVerificationRequired,
      systemTimezone: initialConfig.systemTimezone,
      dateFormat: initialConfig.dateFormat,
    },
  });

  const maintenanceMode = form.watch("maintenanceMode");

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      try {
        let finalLogoUrl = initialConfig.logoUrl;

        // Handle Logo Changes
        if (isLogoRemoved) {
          // Remove file and update config via server action
          const removeResult = await removeLogo();
          if (!removeResult.success) {
            // Failed to remove logo file, continue anyway to ensure DB is updated if possible via updateSystemConfig
          }
          finalLogoUrl = "";
        } else if (pendingLogo) {
          const formData = new FormData();
          formData.append("file", pendingLogo);
          formData.append("skipUpdate", "true"); // Don't update config immediately
          
          const uploadResult = await uploadLogo(formData);
          if (uploadResult.success && uploadResult.url) {
            finalLogoUrl = uploadResult.url;
          } else {
            toast.error(uploadResult.error || "Failed to upload logo");
            return;
          }
        }

        // Update Config
        const result = await updateSystemConfig({
          ...values,
          logoUrl: finalLogoUrl,
        } as Partial<SystemConfig>);

        if (result.success) {
          toast.success("Settings updated successfully");

          // Cleanup: If we successfully updated to a NEW logo, and there was an OLD logo (file),
          // we should delete the old file to prevent accumulation.
          // But only if we didn't just remove it (handled above) and if it actually changed.
          if (!isLogoRemoved && pendingLogo && initialConfig.logoUrl && initialConfig.logoUrl !== finalLogoUrl) {
             // We have a new logo, and there was an old one. Delete the old one.
             // Note: initialConfig.logoUrl is the one BEFORE this save.
             try {
               await deleteLogoFile(initialConfig.logoUrl);
             } catch {
               // Failed to cleanup old logo file, ignore
             }
          }

          // Reset local state
          setPendingLogo(null);
          setIsLogoRemoved(false);
          // logoUrl is already updated visually, but ideally we sync with result or re-init
        } else {
          toast.error(result.error || "Failed to update settings");
        }
      } catch {
        toast.error("An error occurred");
      }
    });
  }

  const executeClearCache = async () => {
    setShowClearCacheDialog(false);
    setIsClearingCache(true);
    try {
      const result = await clearCache();
      if (result.success) {
        toast.success("Cache cleared successfully");
      } else {
        toast.error(result.error || "Failed to clear cache");
      }
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleClearCache = () => {
    setShowClearCacheDialog(true);
  };

  const executeResetDatabase = async () => {
    setShowResetDBDialog(false);
    setIsResettingDB(true);
    try {
      const result = await resetDatabase();
      if (result.success) {
        toast.success("Database reset successfully");
      } else {
        toast.error(result.error || "Failed to reset database");
      }
    } finally {
      setIsResettingDB(false);
    }
  };

  const handleResetDatabase = () => {
    setShowResetDBDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Create local preview
    const preview = URL.createObjectURL(file);
    setLogoUrl(preview);
    setPendingLogo(file);
    setIsLogoRemoved(false);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setShowRemoveDialog(true);
  };

  const confirmRemoveLogo = () => {
    setLogoUrl(undefined);
    setPendingLogo(null);
    setIsLogoRemoved(true);
    setShowRemoveDialog(false);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Platform identity and branding settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="appName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Dayframe Journal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supportEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Support Email</FormLabel>
                      <FormControl>
                        <Input placeholder="support@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="col-span-1 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="appDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Description (Login Page)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Capture your day, track your habits, and reflect on your progress..." 
                            className="resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <FormItem>
                    <FormLabel>Branding Assets</FormLabel>
                    {logoUrl ? (
                      <div className="flex items-start gap-4 p-4 border rounded-md bg-muted/30">
                        <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-background">
                          <Image 
                            src={logoUrl} 
                            alt="Platform Logo" 
                            fill 
                            className="object-contain p-1"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">Current Logo</p>
                          <p className="text-xs text-muted-foreground">
                            This logo will be displayed on the login screen and emails.
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={() => fileInputRef.current?.click()}
                            >
                              Change
                            </Button>
                            <Button 
                              type="button" 
                              variant="destructive" 
                              size="sm" 
                              onClick={handleRemoveLogo}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="border-2 border-dashed border-input rounded-md p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click to upload logo</p>
                        <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG or GIF (max 2MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </FormItem>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Access Control */}
          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
              <CardDescription>Manage registration and site access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="maintenanceMode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Maintenance Mode</FormLabel>
                      <FormDescription>
                        Disable access for all non-admin users.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {maintenanceMode && (
                <FormField
                  control={form.control}
                  name="maintenanceMessage"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2">
                      <FormLabel>Banner Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="We are upgrading the database, back in 15 mins..." 
                          className="resize-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="allowPublicRegistration"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Public Registration</FormLabel>
                        <FormDescription>
                          Allow new users to sign up.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emailVerificationRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Email Verification</FormLabel>
                        <FormDescription>
                          Require verify before login.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Regional Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>Localization and time formatting.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="systemTimezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Timezone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time (US & Canada)</SelectItem>
                          <SelectItem value="America/Chicago">Central Time (US & Canada)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (US & Canada)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (US & Canada)</SelectItem>
                          <SelectItem value="America/Anchorage">Alaska Time (US & Canada)</SelectItem>
                          <SelectItem value="Pacific/Honolulu">Hawaii Time (US)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                          <SelectItem value="Europe/Berlin">Berlin (CET/CEST)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                          <SelectItem value="Asia/Manila">Manila (PHT)</SelectItem>
                          <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                          <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                          <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                          <SelectItem value="Pacific/Auckland">Auckland (NZST/NZDT)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Format</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select date format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (International)</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
        </form>
      </Form>

      {/* Danger Zone */}
      <Card className="border-red-500/30 bg-card">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Destructive actions that affect system data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center p-4 border border-red-200 dark:border-red-900/30 rounded-md bg-background/50">
            <div>
              <h4 className="font-medium">Clear System Cache</h4>
              <p className="text-sm text-muted-foreground">Flushes all server-side caches. May cause temporary performance dip.</p>
            </div>
            <Button variant="outline" onClick={handleClearCache} disabled={isClearingCache} className="border-red-200 hover:bg-red-100 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-900/20 w-full md:w-auto">
              {isClearingCache ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Clear Cache
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-between items-center p-4 border border-red-200 dark:border-red-900/30 rounded-md bg-background/50">
            <div>
              <h4 className="font-medium">Reset Database</h4>
              <p className="text-sm text-muted-foreground">Deletes all data and seeds initial values. Only available in development.</p>
            </div>
            <Button variant="destructive" onClick={handleResetDatabase} disabled={isResettingDB} className="w-full md:w-auto">
              {isResettingDB ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Reset Database
            </Button>
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the branding logo
              from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRemoveLogo} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear System Caches</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all system caches? This might affect performance temporarily.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeClearCache}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetDBDialog} onOpenChange={setShowResetDBDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Database</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-red-500 block mb-1">DANGER ZONE</strong>
              This will delete ALL data including configurations and user accounts. This action cannot be undone. Are you absolutely sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeResetDatabase} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Entire Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
