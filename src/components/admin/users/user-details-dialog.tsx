"use client";

import { Modal } from "@/components/ui/modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Clock, Mail, Shield, CheckCircle2, XCircle } from "lucide-react";
import { User } from "@/types/user";
import { hasPermission } from "@/permissions";
import { toggleUserVerification } from "@/app/admin/users/actions";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface UserDetailsDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailsDialog({ user, open, onOpenChange }: UserDetailsDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleToggleVerification = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const newStatus = !user.emailVerified;
      const result = await toggleUserVerification(user._id, newStatus);
      if (result.success) {
        toast.success(newStatus ? "User verified successfully" : "User unverified successfully");
        // Close dialog to refresh data (since we don't have local state update for parent list here easily without prop drilling)
        // Ideally parent should refresh, or we use router.refresh() if it wasn't a dialog controlled by parent state.
        // Since it's a server action with revalidatePath, the list behind should update.
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to update verification status");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal 
      isOpen={open} 
      onClose={onOpenChange}
      title="User Details"
      description="Detailed information about the user account."
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row justify-between w-full gap-2 sm:gap-0">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
             <Button
              variant="outline"
              size="sm"
              onClick={handleToggleVerification}
              disabled={isUpdating}
              className={cn("w-full sm:w-auto", user.emailVerified ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-green-600 hover:text-green-700 hover:bg-green-50")}
            >
              {user.emailVerified ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Unverify Email
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Verify Email
                </>
              )}
            </Button>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto mt-2 sm:mt-0">
            Close
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 py-4">
        {/* Header Profile Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{user.name}</h3>
            <div className="flex items-center justify-center sm:justify-start text-muted-foreground">
              <Mail className="mr-2 h-4 w-4" />
              <span className="break-all">{user.email}</span>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
              <Badge variant={hasPermission(user, "view:settings") ? "default" : hasPermission(user, "view:assigned-journal") ? "secondary" : "outline"}>
                {user.role}
              </Badge>
            {user.isBanned && (
              <Badge variant="destructive">Banned</Badge>
            )}
            {user.emailVerified ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Verified</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Unverified</Badge>
            )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        {/* Account Info */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" /> Account Information
          </h4>
          <div className="text-sm space-y-2 text-muted-foreground border rounded-md p-3">
            <div className="flex justify-between">
              <span>Username:</span>
              <span className="font-medium text-foreground">{user.username || "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span>ID:</span>
              <span className="font-mono text-xs text-foreground">{user._id}</span>
            </div>
            <div className="flex justify-between">
              <span>Provider:</span>
              <span className="font-medium text-foreground">{user.googleId ? "Google" : "Email"}</span>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" /> Activity
          </h4>
          <div className="text-sm space-y-2 text-muted-foreground border rounded-md p-3">
            <div className="flex justify-between">
              <span>Joined:</span>
              <span className="font-medium text-foreground">{format(new Date(user.createdAt), "PPP")}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Login:</span>
              <span className="font-medium text-foreground">
                {user.lastLogin ? format(new Date(user.lastLogin), "PPP p") : "Never"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
