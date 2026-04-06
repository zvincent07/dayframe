"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createGlobalAlert } from "@/actions/notifications";
import { Send, Loader2 } from "lucide-react";

export function SystemAlertForm() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in both title and message.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createGlobalAlert(title, message);
        if (res.success) {
          toast.success("System Alert broadcasted to all users!");
          setTitle("");
          setMessage("");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to broadcast alert");
      }
    });
  };

  return (
    <form onSubmit={handleBroadcast} className="space-y-4 mt-2">
      <div className="space-y-2">
        <Input 
          disabled={isPending}
          placeholder="Alert Title (e.g., Scheduled Maintenance)" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Textarea 
          disabled={isPending}
          placeholder="Write the broadcast message to all users here..." 
          className="min-h-[100px] resize-none"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>
      <Button disabled={isPending} type="submit" className="w-full">
        {isPending ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Broadcasting...</>
        ) : (
          <><Send className="mr-2 h-4 w-4" /> Dispatch System Alert</>
        )}
      </Button>
    </form>
  );
}
