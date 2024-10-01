"use client";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ExternalLink, EyeIcon, PencilIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

import { useState, useEffect } from "react";
import { useJobLogs } from "../data";

function useLocalStorageState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Get stored value from localStorage or use initialValue
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return initialValue;
    }
  });

  // Update localStorage when state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error("Error writing to localStorage:", error);
      }
    }
  }, [key, state]);

  return [state, setState];
}

type Job = {
  id: number;
  name: string;
  url: string;
  failedStep:
    | {
        name: string;
        started_at: string;
        completed_at: string;
      }
    | null
    | undefined;
  started_at: string;
};

type FailedJobsProps = {
  jobName: string;
  failedJobs: Job[];
};

export function FailedJobs({ jobName, failedJobs }: FailedJobsProps) {
  const [resolutionExplanations, setResolutionExplanations] =
    useLocalStorageState<Record<string, Record<number, string>>>(
      `resolutions_${jobName}`,
      {}
    );

  const [editingJob, setEditingJob] = useState<{
    jobName: string;
    jobId: number;
  } | null>(null);

  const handleResolutionChange = (
    jobName: string,
    jobId: number,
    resolution: string
  ) => {
    setResolutionExplanations((prev) => ({
      ...prev,
      [jobName]: {
        ...prev[jobName],
        [jobId]: resolution,
      },
    }));
    setEditingJob(null);
  };

  const startEditing = (jobName: string, jobId: number) => {
    setEditingJob({ jobName, jobId });
  };

  // Group jobs based on their current resolution
  const groupedFailedJobs = failedJobs.reduce((acc, job) => {
    const resolution =
      resolutionExplanations[jobName]?.[job.id] || "Unresolved";
    if (!acc[resolution]) {
      acc[resolution] = [];
    }
    acc[resolution].push(job);
    return acc;
  }, {} as Record<string, Job[]>);

  return (
    <Dialog>
      <DialogTrigger>
        <Button>Failed Jobs</Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Failed Jobs for {jobName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-120px)]">
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(groupedFailedJobs).map(([resolution, jobs]) => (
              <AccordionItem value={resolution} key={resolution}>
                <AccordionTrigger>
                  {resolution} ({jobs.length})
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Failed Step</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Resolution</TableHead>
                        {/* <TableHead>Error</TableHead> */}
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <Job
                          key={job.id}
                          job={job}
                          jobName={jobName}
                          resolution={
                            resolutionExplanations[jobName]?.[job.id] || ""
                          }
                          isEditing={
                            editingJob?.jobName === jobName &&
                            editingJob?.jobId === job.id
                          }
                          onResolutionChange={handleResolutionChange}
                          onStartEditing={startEditing}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Job({
  job,
  jobName,
  resolution,
  isEditing,
  onResolutionChange,
  onStartEditing,
}: {
  job: Job;
  jobName: string;
  resolution: string;
  isEditing: boolean;
  onResolutionChange: (
    jobName: string,
    jobId: number,
    resolution: string
  ) => void;
  onStartEditing: (jobName: string, jobId: number) => void;
}) {
  const [tempResolution, setTempResolution] = useState(resolution);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // const {
  //   data: logs,
  //   isLoading,
  //   isError,
  // } = useJobLogs({
  //   jobId: job.id,
  //   started_at: job.failedStep?.started_at || null,
  //   completed_at: job.failedStep?.completed_at || null,
  //   isPreviewOpen: isLogsOpen,
  // });

  // const errorLog = logs?.[0]?.context;

  useEffect(() => {
    setTempResolution(resolution);
  }, [resolution]);

  return (
    <>
      <TableRow key={job.id}>
        <TableCell>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center"
          >
            {job.name}
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </TableCell>
        <TableCell>{job.failedStep?.name}</TableCell>
        <TableCell>{new Date(job.started_at).toLocaleString()}</TableCell>

        <TableCell>
          {isEditing ? (
            <Input
              value={tempResolution}
              onChange={(e) => setTempResolution(e.target.value)}
              className="w-full"
            />
          ) : (
            <div className="max-h-24 overflow-y-auto">
              {resolution || "No resolution provided"}
            </div>
          )}
        </TableCell>
        {/* <TableCell>
          <div className="max-h-24 max-w-80 overflow-auto">{errorLog}</div>
        </TableCell> */}
        <TableCell>
          {isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onResolutionChange(jobName, job.id, tempResolution)
              }
            >
              Save
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStartEditing(jobName, job.id)}
            >
              <PencilIcon className="w-4 h-4" />
              <span className="sr-only">Edit resolution</span>
            </Button>
          )}

          {/* <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLogsOpen(!isLogsOpen)}
          >
            <EyeIcon className="w-4 h-4" />
            <span className="sr-only">View logs</span>
          </Button> */}
        </TableCell>
      </TableRow>
    </>
  );
}
