"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateUserProfile } from "@/app/user/profile/actions";
import { uploadAvatar } from "@/actions/upload";
import { useFormStatus } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserRoundCog, Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

/** Match general form controls (same border as Name input) */
const fieldClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground";

const textareaClassName =
  "min-h-0 resize-none rounded-md !border !border-input !bg-background !px-3 !py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      size="sm"
      variant="default"
      className="bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save"}
    </Button>
  );
}

interface ProfileEditDialogProps {
  initialName?: string | null;
  initialBio?: string | null;
  initialGoals?: string | null;
  initialImage?: string | null;
  initials?: string;
}

export function ProfileEditDialog({ initialName, initialBio, initialGoals, initialImage, initials }: ProfileEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { update } = useSession();
  const router = useRouter();

  const displayImage = avatarPreview || initialImage || "";

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadAvatar(fd);
      if (result.success && result.url) {
        setAvatarUrl(result.url);
      } else {
        toast.error(result.error || "Upload failed");
        setAvatarPreview(null);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition-all duration-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 shadow-sm"
      >
        <UserRoundCog className="w-4 h-4 shrink-0 text-emerald-500/70" aria-hidden />
        Edit Profile
      </button>
      <Modal
        isOpen={open}
        onClose={setOpen}
        title="Your profile"
        description="Update the details you see here and in exports."
        size="md"
        className="bg-card"
      >
        <form
          className="space-y-5"
          action={async (fd) => {
            if (avatarUrl) fd.set("avatarUrl", avatarUrl);
            const res = await updateUserProfile(fd);
            if (res.success) {
              const newName = fd.get("name")?.toString();
              await update({
                user: {
                  ...(newName ? { name: newName } : {}),
                  ...(avatarUrl ? { image: avatarUrl } : {}),
                },
              });
            }
            setAvatarPreview(null);
            setAvatarUrl(null);
            setOpen(false);
            router.refresh();
          }}
        >
          <div className="mt-2 pr-1">
            <fieldset className="space-y-5 border-0 p-0">
              <legend className="sr-only">Profile fields</legend>

              {/* Avatar picker */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="relative group shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Avatar className="h-16 w-16 border-2 border-primary/10 shadow-sm">
                    <AvatarImage src={displayImage} alt={initialName || ""} />
                    <AvatarFallback className="text-lg font-bold bg-primary/5 text-primary">{initials || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </div>
                </button>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline text-left"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Change photo"}
                  </button>
                  <span className="text-xs text-muted-foreground">JPG, PNG or WebP. Max 2MB.</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="profile-edit-name" className="text-sm font-medium text-foreground">
                  Name
                </label>
                <Input
                  id="profile-edit-name"
                  name="name"
                  type="text"
                  defaultValue={initialName ?? ""}
                  placeholder="How you want to be called"
                  autoComplete="name"
                  className={fieldClassName}
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <label htmlFor="profile-edit-bio" className="text-sm font-medium text-foreground">
                    Bio
                  </label>
                  <span className="text-xs text-muted-foreground">Up to 500 characters</span>
                </div>
                <Textarea
                  id="profile-edit-bio"
                  name="bio"
                  defaultValue={initialBio ?? ""}
                  placeholder="A line or two about you"
                  rows={4}
                  className={`min-h-[5.5rem] ${textareaClassName}`}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="profile-edit-goals" className="text-sm font-medium text-foreground">
                  Goals
                </label>
                <Textarea
                  id="profile-edit-goals"
                  name="goals"
                  defaultValue={initialGoals ?? ""}
                  placeholder="Separate with commas"
                  rows={2}
                  className={`min-h-14 ${textareaClassName}`}
                />
              </div>
            </fieldset>

            <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <SaveButton />
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
