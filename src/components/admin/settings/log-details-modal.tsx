import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, Target, Globe, Monitor, Check, Copy } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LogEntry } from "./audit-log-table";
import { parseUserAgent } from "@/lib/user-agent";

interface LogDetailsModalProps {
  log: LogEntry;
  isOpen: boolean;
  onClose: () => void;
}

// Simple JSON syntax highlighter (escaped)
const SyntaxHighlightedJSON = ({ data }: { data: unknown }) => {
  if (!data) return null;
  
  const json = JSON.stringify(data, null, 2);
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const html = escapeHtml(json).replace(/(&quot;(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\&quot;])*&quot;(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'text-orange-600 dark:text-orange-400'; // number
    if (/^&quot;/.test(match)) {
        if (/:$/.test(match)) {
            cls = 'text-blue-600 dark:text-blue-400'; // key
        } else {
            cls = 'text-green-600 dark:text-green-400'; // string
        }
    } else if (/true|false/.test(match)) {
        cls = 'text-purple-600 dark:text-purple-400'; // boolean
    } else if (/null/.test(match)) {
        cls = 'text-gray-500'; // null
    }
    return `<span class="${cls}">${match}</span>`;
  });

  return (
    <pre 
      className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto custom-scrollbar"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

const getFlagEmoji = (countryCode: string) => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function LogDetailsModal({ log, isOpen, onClose }: LogDetailsModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);

  useEffect(() => {
    if (!log.ipAddress) return;
    
    if (log.ipAddress === "::1" || log.ipAddress === "127.0.0.1") {
      // Wrap in timeout to avoid synchronous state update warning
      setTimeout(() => setLocation("Localhost"), 0);
      return;
    }

    // Try to resolve location for real IPs
    // Using a free endpoint for demo purposes
    fetch(`https://ipapi.co/${log.ipAddress}/json/`)
      .then(res => res.json())
      .then(data => {
        if (data.city && data.country_code) {
          const flag = getFlagEmoji(data.country_code);
          setLocation(`${flag} ${data.city}, ${data.country_code}`);
        }
      })
      .catch(() => {
        // Silent fail or set null
        setLocation(null);
      });
  }, [log.ipAddress]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Override badge styles for the "Neon" look
  const getBadgeStyle = (action: string) => {
    if (action.includes("DELETE") || action.includes("BANNED") || action.includes("FAILED") || action.includes("CRITICAL") || action.includes("DISABLED")) {
      return "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20 border-0";
    }
    if (action.includes("UPDATE") || action.includes("EDIT") || action.includes("RESET")) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-500 ring-1 ring-amber-500/20 hover:bg-amber-500/20 border-0";
    }
    if (action.includes("CREATE") || action.includes("SUCCESS") || action.includes("ENABLED")) {
      return "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 border-0";
    }
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 hover:bg-blue-500/20 border-0";
  };

  const renderDiff = (details: unknown) => {
    if (!details) return <div className="text-muted-foreground text-sm italic">No details available</div>;

    // Check if it's a simple diff (previousValue/newValue pattern)
    if (typeof details === 'object' && details !== null && 'previousValue' in details && 'newValue' in details) {
      const diffDetails = details as { previousValue: unknown; newValue: unknown };
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Changes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500/50" /> Previous Value
              </span>
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-xs font-mono overflow-x-auto">
                <SyntaxHighlightedJSON data={diffDetails.previousValue} />
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500/50" /> New Value
              </span>
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 text-xs font-mono overflow-x-auto">
                <SyntaxHighlightedJSON data={diffDetails.newValue} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default JSON view for other details
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">Raw Metadata</h4>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs gap-1"
            onClick={() => copyToClipboard(JSON.stringify(details, null, 2), 'details')}
          >
            {copiedId === 'details' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copiedId === 'details' ? <span className="text-emerald-500">Copied!</span> : "Copy JSON"}
          </Button>
        </div>
        <div className="relative rounded-md border bg-muted/30 p-4">
          <SyntaxHighlightedJSON data={details} />
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2 pr-4">
            <Badge variant="outline" className={`text-sm px-3 py-1 ${getBadgeStyle(log.action)}`}>
              {log.action}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1 font-normal">
              <Clock className="w-3.5 h-3.5" />
              {format(new Date(log.createdAt), "PPpp")}
            </span>
          </div>
          <span>Audit Log Details</span>
        </div>
      }
      description={
        <span>Log ID: <span className="font-mono text-xs text-zinc-500">{log._id}</span></span>
      }
      footer={
        <Button variant="ghost" onClick={onClose}>Close</Button>
      }
    >
      <div className="grid gap-6 py-4 px-1">
        {/* Actor & Target Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 p-4 rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Actor
            </h4>
            <div className="space-y-1 overflow-hidden">
              <div className="text-sm font-medium truncate">{log.actorEmail}</div>
              <div className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-full max-w-full flex items-center gap-2 overflow-hidden">
                <span className="shrink-0">ID:</span>
                <span className="font-mono text-zinc-500 truncate min-w-0 flex-1">{log.actorId}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 shrink-0" 
                  onClick={() => copyToClipboard(log.actorId, 'actorId')}
                >
                  {copiedId === 'actorId' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-3 p-4 rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Target
            </h4>
            <div className="space-y-1 overflow-hidden">
              <div className="text-sm font-medium truncate">{log.targetType || "N/A"}</div>
              {log.targetId && (
                <div className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-full max-w-full flex items-center gap-2 overflow-hidden">
                  <span className="shrink-0">ID:</span>
                  <span className="font-mono text-zinc-500 truncate min-w-0 flex-1">{log.targetId}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 shrink-0" 
                    onClick={() => copyToClipboard(log.targetId || "", 'targetId')}
                  >
                    {copiedId === 'targetId' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Network Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Network Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">IP Address</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{log.ipAddress || "N/A"}</span>
                  {location && (
                    <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded-sm border shadow-sm">
                      {location}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-muted-foreground font-semibold">User Agent</span>
                <div className="flex flex-col">
                  <span className="font-medium text-xs">
                    {parseUserAgent(typeof log.details?.userAgent === 'string' ? (log.details.userAgent as string) : "")}
                  </span>
                  <span className="truncate max-w-[200px] text-[10px] text-muted-foreground" title={typeof log.details?.userAgent === 'string' ? (log.details.userAgent as string) : ""}>
                    {typeof log.details?.userAgent === 'string' ? (log.details.userAgent as string) : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details / Diff */}
        <div className="pt-2 border-t">
          {renderDiff(log.details)}
        </div>
      </div>
    </Modal>
  );
}
