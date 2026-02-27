"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, FileEdit, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { CronJob, CronResponse, CronUser, Device } from "@/types";

interface CronJobTableProps {
  device: Device;
}

interface NormalizedCronData {
  users: Record<string, CronUser>;
  system: { jobs: CronJob[] };
}

function normalizeCronResponse(data: unknown): NormalizedCronData {
  const typed = data as Record<string, unknown>;

  // New format: { users: {...}, system: {...} }
  if (typed.users && typeof typed.users === "object") {
    return typed as unknown as CronResponse;
  }

  // Old format: { jobs: [...] }
  if (Array.isArray(typed.jobs)) {
    const jobs = typed.jobs as CronJob[];
    const byUser: Record<string, CronJob[]> = {};
    for (const job of jobs) {
      const user = job.user || "unknown";
      if (!byUser[user]) byUser[user] = [];
      byUser[user].push(job);
    }

    const users: Record<string, CronUser> = {};
    for (const [user, userJobs] of Object.entries(byUser)) {
      users[user] = {
        raw: userJobs
          .map((j) => {
            const prefix = j.enabled ? "" : "#";
            return `${prefix}${j.schedule} ${j.command}`;
          })
          .join("\n"),
        jobs: userJobs,
      };
    }

    return { users, system: { jobs: [] } };
  }

  return { users: {}, system: { jobs: [] } };
}

function JobRow({
  job,
  onToggle,
  saving,
}: {
  job: CronJob;
  onToggle: () => void;
  saving: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
        job.enabled ? "bg-background" : "bg-muted/50"
      }`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          job.enabled ? "bg-green-500" : "bg-gray-400"
        }`}
      />

      <Badge
        variant="secondary"
        className={`font-mono text-xs shrink-0 ${
          job.enabled ? "" : "opacity-60"
        }`}
      >
        {job.schedule}
      </Badge>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`flex-1 truncate font-mono text-xs ${
                job.enabled
                  ? "text-foreground"
                  : "text-muted-foreground line-through"
              }`}
            >
              {job.command}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-md break-all">
            <p className="font-mono text-xs">{job.command}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        onClick={onToggle}
        disabled={saving}
        title={job.enabled ? "Disable" : "Enable"}
      >
        {job.enabled ? (
          <ToggleRight className="h-4 w-4 text-green-600" />
        ) : (
          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}

export function CronJobTable({ device }: CronJobTableProps) {
  const [cronData, setCronData] = useState<NormalizedCronData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Raw editor state
  const [rawEditorOpen, setRawEditorOpen] = useState(false);
  const [rawEditorUser, setRawEditorUser] = useState("");
  const [rawEditorContent, setRawEditorContent] = useState("");

  const fetchCronJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/devices/${device.id}/cron`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setCronData(normalizeCronResponse(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [device.id]);

  useEffect(() => {
    fetchCronJobs();
  }, [fetchCronJobs]);

  async function saveCrontab(user: string, content: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/devices/${device.id}/cron`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, content }),
      });

      if (res.ok) {
        toast.success(`Crontab saved for ${user}`);
        await fetchCronJobs();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save crontab");
      }
    } catch {
      toast.error("Failed to connect to device");
    } finally {
      setSaving(false);
    }
  }

  function handleToggleJob(user: string, jobIndex: number) {
    if (!cronData) return;

    const userData = cronData.users[user];
    if (!userData) return;

    // Build new raw content by toggling the target job
    const lines = userData.raw.split("\n");
    let jobCount = 0;

    const newLines = lines.map((line) => {
      const trimmed = line.trim();
      // Skip empty lines and non-job comments (lines that don't look like cron entries)
      if (trimmed === "") return line;

      const isCommentedJob = trimmed.startsWith("#") && isCronLine(trimmed.slice(1).trim());
      const isActiveJob = !trimmed.startsWith("#") && isCronLine(trimmed);

      if (isCommentedJob || isActiveJob) {
        if (jobCount === jobIndex) {
          jobCount++;
          if (isActiveJob) {
            // Disable: prepend #
            return `#${line}`;
          } else {
            // Enable: remove leading #
            return line.replace(/^(\s*)#/, "$1");
          }
        }
        jobCount++;
      }

      return line;
    });

    saveCrontab(user, newLines.join("\n"));
  }

  function openRawEditor(user: string) {
    if (!cronData) return;
    const userData = cronData.users[user];
    setRawEditorUser(user);
    setRawEditorContent(userData?.raw ?? "");
    setRawEditorOpen(true);
  }

  function handleSaveRaw() {
    saveCrontab(rawEditorUser, rawEditorContent);
    setRawEditorOpen(false);
  }

  const userNames = cronData ? Object.keys(cronData.users) : [];
  const systemJobs = cronData?.system?.jobs ?? [];
  const hasSystem = systemJobs.length > 0;
  const allSections = [...userNames, ...(hasSystem ? ["system"] : [])];
  const defaultTab = allSections[0] ?? "empty";

  function userJobCount(user: string): number {
    return cronData?.users[user]?.jobs.length ?? 0;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Cron Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading cron jobs...
            </p>
          ) : error ? (
            <p className="text-sm text-red-500">Error: {error}</p>
          ) : allSections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cron jobs found.
            </p>
          ) : (
            <Tabs defaultValue={defaultTab}>
              <TabsList>
                {userNames.map((user) => (
                  <TabsTrigger key={user} value={user}>
                    {user}
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      {userJobCount(user)}
                    </Badge>
                  </TabsTrigger>
                ))}
                {hasSystem && (
                  <TabsTrigger value="system">
                    system
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                      {systemJobs.length}
                    </Badge>
                  </TabsTrigger>
                )}
              </TabsList>

              {userNames.map((user) => {
                const jobs = cronData!.users[user]?.jobs ?? [];
                return (
                  <TabsContent key={user} value={user} className="mt-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {jobs.length} job{jobs.length !== 1 ? "s" : ""} configured
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRawEditor(user)}
                      >
                        <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                        Edit Raw
                      </Button>
                    </div>
                    {jobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No cron jobs for this user.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {jobs.map((job, i) => (
                          <JobRow
                            key={`${user}-${i}`}
                            job={job}
                            onToggle={() => handleToggleJob(user, i)}
                            saving={saving}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              })}

              {hasSystem && (
                <TabsContent value="system" className="mt-3">
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground">
                      {systemJobs.length} system job{systemJobs.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {systemJobs.map((job, i) => (
                      <div
                        key={`system-${i}`}
                        className="flex items-center gap-3 rounded-md border px-3 py-2 bg-background"
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            job.enabled ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                        <Badge variant="secondary" className="font-mono text-xs shrink-0">
                          {job.schedule}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex-1 truncate font-mono text-xs text-foreground">
                                {job.command}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-md break-all">
                              <p className="font-mono text-xs">{job.command}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={rawEditorOpen} onOpenChange={setRawEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit Crontab &mdash; {rawEditorUser}
            </DialogTitle>
          </DialogHeader>
          <textarea
            className="h-64 w-full rounded-md border bg-muted/50 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            value={rawEditorContent}
            onChange={(e) => setRawEditorContent(e.target.value)}
            spellCheck={false}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRawEditorOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRaw} disabled={saving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Heuristic to detect whether a line looks like a cron schedule entry.
 * Cron lines start with 5 schedule fields (or common shortcuts like @reboot).
 */
function isCronLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return false;

  // Match @reboot, @hourly, @daily, @weekly, @monthly, @yearly, @annually
  if (/^@(reboot|hourly|daily|weekly|monthly|yearly|annually)\s/.test(trimmed)) {
    return true;
  }

  // Match standard 5-field cron schedule: each field can be *, a number, ranges, etc.
  const cronFieldPattern = /^[\d*,/\-]+\s+[\d*,/\-]+\s+[\d*,/\-]+\s+[\d*,/\-]+\s+[\d*,/\-]+\s+/;
  return cronFieldPattern.test(trimmed);
}
