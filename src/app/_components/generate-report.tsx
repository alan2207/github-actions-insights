"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { getWorkflowRunJobs, useOwner, useRepo } from "../data";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { WorkflowRun } from "../types";
import { FailedJobs } from "./failed-jobs";
import { EyeIcon } from "lucide-react";
import { Export } from "./export";

type JobStats = {
  success: number;
  failure: number;
  cancelled: number;
  skipped: number;
  totalDuration: number;
  failedJobs: {
    name: string;
    branch: string;
    url: string;
    id: number;
    started_at: string;
    failedStep:
      | {
          name: string;
          started_at: string;
          completed_at: string;
        }
      | null
      | undefined;
  }[];
  count: number;
};

type CumulativeStats = {
  date: string;
  success: number;
  failure: number;
  cancelled: number;
  skipped: number;
};

export function GenerateReport({
  workflowRuns,
}: {
  workflowRuns: WorkflowRun[];
}) {
  const [jobsNameFilter, setJobsNameFilter] = useState("");

  const [showSkipped, setShowSkipped] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<{
    jobStats: Record<string, JobStats>;
    cumulativeStats: CumulativeStats[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>();
  const [owner] = useOwner();
  const [repo] = useRepo();

  const queryClient = useQueryClient();

  const getCachedJobs = async (runId: number) => {
    const cachedData = queryClient.getQueryData([
      "workflowRunJobs",
      owner,
      repo,
      runId,
    ]);
    if (cachedData) {
      return cachedData as Awaited<ReturnType<typeof getWorkflowRunJobs>>;
    }
    return queryClient.fetchQuery({
      queryKey: ["workflowRunJobs", owner, repo, runId],
      queryFn: () => getWorkflowRunJobs({ runId, owner, repo }),
      staleTime: 6 * 60 * 60 * 1000, // 6 hours,
    });
  };

  const generateReport = async (
    jobName: string,
    showCancelled: boolean,
    showSkipped: boolean
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const jobStats: Record<string, JobStats> = {};
      const dailyStats: Record<string, CumulativeStats> = {};

      const sortedWorkflowRuns = [...workflowRuns].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Process workflow runs in batches of 20
      for (let i = 0; i < sortedWorkflowRuns.length; i += 20) {
        const batch = sortedWorkflowRuns.slice(i, i + 20);
        const runJobsPromises = batch.map((run) => getCachedJobs(run.id));
        const runJobsResults = await Promise.all(runJobsPromises);

        batch.forEach((run, index) => {
          const runJobs = runJobsResults[index];
          const date = new Date(run.created_at).toISOString().split("T")[0];

          if (!dailyStats[date]) {
            dailyStats[date] = {
              date,
              success: 0,
              failure: 0,
              cancelled: 0,
              skipped: 0,
            };
          }

          runJobs.jobs
            .filter((job) => job.name.includes(jobName))
            .forEach((job) => {
              if (!jobStats[job.name]) {
                jobStats[job.name] = {
                  success: 0,
                  failure: 0,
                  cancelled: 0,
                  skipped: 0,
                  totalDuration: 0,
                  count: 0,
                  failedJobs: [],
                };
              }

              const conclusion = job.conclusion || "skipped";

              if (
                (conclusion === "cancelled" && !showCancelled) ||
                (conclusion === "skipped" && !showSkipped)
              ) {
                return;
              }

              jobStats[job.name][conclusion as keyof JobStats]++;
              jobStats[job.name].count++;
              jobStats[job.name].totalDuration +=
                new Date(job.completed_at ?? "").getTime() -
                new Date(job.started_at ?? "").getTime();

              if (conclusion === "failure") {
                const failedStep = job.steps?.find(
                  (step) => step.conclusion === "failure"
                );
                jobStats[job.name].failedJobs.push({
                  name: job.id.toString(),
                  branch: job.branch ?? "",
                  url: job.html_url ?? "",
                  id: job.id,
                  started_at: job.started_at ?? "",
                  failedStep: {
                    name: failedStep?.name ?? "",
                    started_at: failedStep?.started_at ?? "",
                    completed_at: failedStep?.completed_at ?? "",
                  },
                });
              }

              dailyStats[date][conclusion as keyof CumulativeStats]++;
            });
        });
      }

      const cumulativeStats = Object.values(dailyStats);

      setReport({ jobStats, cumulativeStats });
      setIsOpen(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setReport(null);
      setError(null);
      setJobsNameFilter("");
      setShowCancelled(false);
      setShowSkipped(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      generateReport(jobsNameFilter, showCancelled, showSkipped);
    }
  }, [jobsNameFilter, isOpen, showCancelled, showSkipped]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          onClick={() => generateReport("", showCancelled, showSkipped)}
          disabled={isLoading || workflowRuns.length === 0}
        >
          {isLoading ? (
            "Generating..."
          ) : (
            <>
              <EyeIcon className="w-4 h-4 mr-2" /> View Stats
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Report
            <Export
              name={`jobs`}
              generateJSONContent={() => {
                const json = JSON.stringify(report, null, 2);
                return json;
              }}
              generateCSVContent={() => {
                const headers = [
                  "Job Name",
                  "Success",
                  "Failure",
                  "Cancelled",
                  "Skipped",
                  "Count",
                  "Total Duration",
                  "Failed Jobs",
                ];
                const rows = Object.entries(report?.jobStats ?? {}).map(
                  ([jobName, stats]) => [
                    jobName,
                    stats.success,
                    stats.failure,
                    stats.cancelled,
                    stats.skipped,
                    stats.count,
                    stats.totalDuration,
                    stats.failedJobs.length,
                  ]
                );

                const csv = [
                  headers.join(","),
                  ...rows.map((row) => row.join(",")),
                ].join("\n");

                return csv;
              }}
            />
          </DialogTitle>
          <DialogDescription>
            Summary of workflow runs and job statistics
          </DialogDescription>
          {error && <Alert>Error: {error}</Alert>}
          {isLoading && <Alert>Loading...</Alert>}
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-120px)]">
          {report && (
            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Job Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={report.cumulativeStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <Legend
                        onClick={(e) => {
                          if (e.dataKey === "skipped") {
                            setShowSkipped((v) => !v);
                          }
                          if (e.dataKey === "cancelled") {
                            setShowCancelled((v) => !v);
                          }
                        }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="success" stackId="a" fill="#4ade80" />
                      <Bar dataKey="failure" stackId="a" fill="#f87171" />
                      <Bar dataKey="cancelled" stackId="a" fill="#fbbf24" />
                      <Bar dataKey="skipped" stackId="a" fill="#60a5fa" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    className="mb-4"
                    placeholder="Search Job"
                    value={jobsNameFilter}
                    onChange={(e) => setJobsNameFilter(e.target.value)}
                  />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Name</TableHead>
                        <TableHead>Success</TableHead>
                        <TableHead>Failure</TableHead>
                        {showCancelled && <TableHead>Cancelled</TableHead>}
                        {showSkipped && <TableHead>Skipped</TableHead>}
                        <TableHead>Avg. Duration</TableHead>
                        <TableHead>Failed Jobs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(report.jobStats)
                        .filter(([jobName]) => jobName.includes(jobsNameFilter))
                        .map(([jobName, stats]) => (
                          <TableRow key={jobName}>
                            <TableCell className="font-medium">
                              <span
                                className="cursor-pointer hover:underline"
                                onClick={() => {
                                  if (jobName === jobsNameFilter) {
                                    setJobsNameFilter("");
                                  } else {
                                    setJobsNameFilter(jobName);
                                  }
                                }}
                              >
                                {jobName}
                              </span>
                            </TableCell>
                            <TableCell>{stats.success}</TableCell>
                            <TableCell>{stats.failure}</TableCell>
                            {showCancelled && (
                              <TableCell>{stats.cancelled}</TableCell>
                            )}
                            {showSkipped && (
                              <TableCell>{stats.skipped}</TableCell>
                            )}
                            <TableCell>
                              {stats.count > 0
                                ? `${(
                                    stats.totalDuration /
                                    stats.count /
                                    1000
                                  ).toFixed(2)}s`
                                : "N/A"}
                            </TableCell>
                            <TableCell>
                              {stats.failedJobs.length > 0 && (
                                <FailedJobs
                                  jobName={jobName}
                                  failedJobs={stats.failedJobs}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
