"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export function EmailBlastForm({ templates }: { templates: any[] }) {
  const [templateId, setTemplateId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleSend = () => {
    if (!templateId) return toast.error("Please select a template");
    
    startTransition(async () => {
      // Simulate sending via a slight delay
      await new Promise(r => setTimeout(r, 1500));
      
      const selected = templates.find(t => t._id === templateId);
      if (selected) {
        toast.success(`Mock: Successfully sent "${selected.name}" to all active subscribers via SES.`);
      }
      setTemplateId("");
    });
  };

  return (
    <div className="flex flex-col space-y-4">
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-border rounded-md">
          <Mail className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No email templates found.</p>
          <p className="text-xs mt-1 text-muted-foreground">Create one in Content Management first.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {templateId && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border border-border">
              <strong>Preview:</strong> Subject: "{templates.find(t => t._id === templateId)?.subject}"
            </div>
          )}

          <Button 
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white" 
            onClick={handleSend}
            disabled={!templateId || isPending}
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Send Email Blast
          </Button>
        </>
      )}
    </div>
  );
}
