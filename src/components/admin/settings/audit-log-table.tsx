"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, ArrowLeft, ArrowRight } from "lucide-react";
import { LogDetailsModal } from "./log-details-modal";

export interface LogEntry {
  _id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

interface AuditLogTableProps {
  logs: LogEntry[];
  totalPages: number;
  currentPage: number;
  systemTimezone?: string;
}

export function AuditLogTable({ logs, totalPages, currentPage, systemTimezone = "UTC" }: AuditLogTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    startTransition(() => {
      router.push(`/admin/settings?${params.toString()}`, { scroll: false });
    });
  };

  const formatTimezoneDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: systemTimezone === 'UTC' ? 'UTC' : systemTimezone
    }).format(date);
  };

  const formatTimezoneTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: systemTimezone === 'UTC' ? 'UTC' : systemTimezone
    }).format(date);
  };

  const getActionBadgeProps = (action: string) => {
    if (action.includes("DELETE") || action.includes("BANNED") || action.includes("FAILED") || action.includes("CRITICAL") || action.includes("DISABLED")) {
      return { variant: "destructive" as const, className: "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20 border-0" };
    }
    if (action.includes("UPDATE") || action.includes("EDIT") || action.includes("RESET")) {
      return { variant: "secondary" as const, className: "bg-amber-500/10 text-amber-600 dark:text-amber-500 ring-1 ring-amber-500/20 hover:bg-amber-500/20 border-0" };
    }
    if (action.includes("CREATE") || action.includes("SUCCESS") || action.includes("ENABLED")) {
      return { variant: "default" as const, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 border-0" };
    }
    return { variant: "secondary" as const, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 hover:bg-blue-500/20 border-0" };
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table className={isPending ? "opacity-50 transition-opacity pointer-events-none" : "transition-opacity"}>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="w-[100px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    <div className="flex flex-col">
                      <span>{formatTimezoneDate(new Date(log.createdAt))}</span>
                      <span className="text-xs text-muted-foreground">{formatTimezoneTime(new Date(log.createdAt))}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{log.actorEmail}</span>
                      <span className="text-xs font-mono text-muted-foreground truncate w-24" title={log.actorId}>
                        {log.actorId}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge {...getActionBadgeProps(log.action)}>{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{log.targetType || "-"}</span>
                      {log.targetId && (
                        <span className="text-xs font-mono text-muted-foreground truncate w-24" title={log.targetId}>
                          {log.targetId}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">View details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedLog && (
        <LogDetailsModal 
          log={selectedLog} 
          isOpen={!!selectedLog} 
          onClose={() => setSelectedLog(null)} 
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

