"use client";

import { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createUser } from "@/app/admin/users/actions";
import { Plus, Loader2, Copy, Check } from "lucide-react";
import { Role } from "@/permissions/roles";

export function AddUserDialog({ onUserCreated }: { onUserCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user" as Role,
    password: "",
  });

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Password copied to clipboard");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "user",
      password: "",
    });
    setGeneratedPassword(null);
    setCopied(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Only reset if closing
      if (!generatedPassword) {
        resetForm();
      }
    }
    setOpen(newOpen);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Basic validation
      if (!formData.name || !formData.email) {
        toast.error("Name and Email are required");
        setIsLoading(false);
        return;
      }

      const result = await createUser({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        password: formData.password || undefined, // Send undefined if empty to trigger auto-generation
      });

      if (result.success) {
        toast.success("User created successfully");
        if (onUserCreated) onUserCreated();
        if (result.tempPassword) {
          setGeneratedPassword(result.tempPassword);
        } else {
          setOpen(false);
          resetForm();
        }
      } else {
        toast.error(result.error || "Failed to create user");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button className="w-10 h-10 p-0 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full sm:rounded-md" onClick={() => handleOpenChange(true)}>
        <Plus className="h-5 w-5 sm:mr-2 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Add User</span>
      </Button>
      <Modal 
        isOpen={open} 
        onClose={handleOpenChange}
        title="Add New User"
        description="Create a new user account."
        size="md"
      >
        {generatedPassword ? (
          <div className="space-y-4 py-4">
            <div className="rounded-md bg-muted p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Temporary Password</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleCopyPassword}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="text-lg font-mono break-all bg-background p-2 rounded border">
                {generatedPassword}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Please copy and share this password with the user immediately. It will not be shown again.
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={() => {
                setOpen(false);
                resetForm();
              }}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 py-2 px-1">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: Role) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input
                  id="password"
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank to auto-generate"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
