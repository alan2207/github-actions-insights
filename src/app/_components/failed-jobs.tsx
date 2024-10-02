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

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";

import { Textarea } from "@/components/ui/textarea";
import { Export } from "./export";

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
  branch: string;
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

type FailureMap = Record<string, { jobId: number; hidden: boolean }[]>;

export function FailedJobs({ jobName, failedJobs }: FailedJobsProps) {
  const [failureMap, setFailureMap] = useLocalStorageState<FailureMap>(
    `failures_${jobName}`,
    {}
  );

  const [editingJob, setEditingJob] = useState<{
    jobName: string;
    jobId: number;
  } | null>(null);
  const [showHidden, setShowHidden] = useState(true);

  const handleFailureChange = (
    jobName: string,
    jobId: number,
    newFailures: string[]
  ) => {
    setFailureMap((prev) => {
      const updatedMap = { ...prev };

      // Remove job from all existing failures
      Object.keys(updatedMap).forEach((failure) => {
        updatedMap[failure] = updatedMap[failure]?.filter?.(
          (job) => job.jobId !== jobId
        );
      });

      // Add job to new failures
      newFailures.forEach((failure) => {
        if (!updatedMap[failure]) {
          updatedMap[failure] = [];
        }
        updatedMap[failure].push({ jobId, hidden: false });
      });

      // Clean up empty failure arrays
      Object.keys(updatedMap).forEach((failure) => {
        if (updatedMap[failure]?.length === 0) {
          delete updatedMap[failure];
        }
      });

      return updatedMap;
    });
    setEditingJob(null);
  };

  const handleHide = (failure: string, jobId: number, hidden: boolean) => {
    setFailureMap((prev) => ({
      ...prev,
      [failure]: prev[failure]?.map((job) =>
        job.jobId === jobId ? { ...job, hidden } : job
      ),
    }));
  };

  const startEditing = (jobName: string, jobId: number) => {
    setEditingJob({ jobName, jobId });
  };

  // Group jobs based on their current failures
  const groupedFailedJobs = failedJobs.reduce((acc, job) => {
    const jobFailures = Object.entries(failureMap)
      .filter(([_, jobs]) => jobs?.some?.((j) => j.jobId === job.id))
      .map(([failure]) => failure);

    if (jobFailures.length === 0) {
      if (!acc["Unresolved"]) acc["Unresolved"] = [];
      acc["Unresolved"].push(job);
    } else {
      jobFailures.forEach((failure) => {
        if (!acc[failure]) acc[failure] = [];
        acc[failure].push(job);
      });
    }

    return acc;
  }, {} as Record<string, Job[]>);

  // Filter jobs based on showHidden state
  const filteredGroupedFailedJobs = Object.entries(groupedFailedJobs).reduce(
    (acc, [failure, jobs]) => {
      const filteredJobs = showHidden
        ? jobs
        : jobs.filter(
            (job) =>
              !failureMap[failure]?.some((j) => j.jobId === job.id && j.hidden)
          );

      if (filteredJobs.length > 0) {
        acc[failure] = filteredJobs;
      }
      return acc;
    },
    {} as Record<string, Job[]>
  );

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline" size="sm">
          <EyeIcon className="w-4 h-4 mr-2" />
          Failed Jobs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Failed Jobs for {jobName}</DialogTitle>

            <Export
              name={`${jobName}-failed-jobs.json`}
              generateCSVContent={() => {
                const groupedData = Object.entries(groupedFailedJobs).flatMap(
                  ([failure, jobs]) =>
                    jobs.map((job) => ({
                      failure,
                      job: job.name,
                      branch: job.branch,
                      url: job.url,
                      failedStep: job.failedStep?.name,
                      started_at: job.started_at,
                    }))
                );

                const headers = [
                  "Failure",
                  "Job",
                  "Branch",
                  "URL",
                  "Failed Step",
                  "Started At",
                ];
                const csvString = [
                  headers.join(","),
                  ...groupedData.map((row) =>
                    [
                      row.failure,
                      row.job,
                      row.branch,
                      row.url,
                      row.failedStep,
                      row.started_at,
                    ].join(",")
                  ),
                ].join("\n");

                return csvString;
              }}
              generateJSONContent={() => {
                const groupedData = Object.entries(groupedFailedJobs).map(
                  ([failure, jobs]) => ({
                    failure,
                    jobs: jobs.map((job) => ({
                      job: job.name,
                      branch: job.branch,
                      url: job.url,
                      failedStep: job.failedStep?.name,
                      started_at: job.started_at,
                    })),
                  })
                );

                const json = JSON.stringify(groupedData, null, 2);

                return json;
              }}
            />
          </div>
        </DialogHeader>
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="show-hidden"
            checked={showHidden}
            onCheckedChange={(checked) => setShowHidden(checked as boolean)}
          />
          <label
            htmlFor="show-hidden"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Show hidden items
          </label>
        </div>
        <ScrollArea className="h-[calc(90vh-120px)]">
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(filteredGroupedFailedJobs).map(
              ([failure, jobs]) => (
                <AccordionItem value={failure} key={failure}>
                  <AccordionTrigger>
                    {failure} ({jobs.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead>Failed Step</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Failure</TableHead>
                          <TableHead>Edit</TableHead>
                          <TableHead>Hidden</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.map((job) => (
                          <Job
                            key={`${job.id}-${failure}`}
                            job={job}
                            jobName={jobName}
                            failure={failure}
                            failureMap={failureMap}
                            onHide={handleHide}
                            isEditing={
                              editingJob?.jobName === jobName &&
                              editingJob?.jobId === job.id
                            }
                            onFailureChange={handleFailureChange}
                            onStartEditing={startEditing}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              )
            )}
          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Job({
  job,
  jobName,
  failure,
  failureMap,
  onHide,
  isEditing,
  onFailureChange,
  onStartEditing,
}: {
  job: Job;
  jobName: string;
  failure: string;
  failureMap: FailureMap;
  onHide: (failure: string, jobId: number, hidden: boolean) => void;
  isEditing: boolean;
  onFailureChange: (jobName: string, jobId: number, failures: string[]) => void;
  onStartEditing: (jobName: string, jobId: number) => void;
}) {
  const jobFailures = Object.entries(failureMap)
    .filter(([_, jobs]) => jobs?.some?.((j) => j.jobId === job.id))
    .map(([failure]) => failure);

  const [inputValue, setInputValue] = useState(jobFailures.join(", "));

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSave = () => {
    onFailureChange(
      jobName,
      job.id,
      inputValue
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
    );
  };

  const isHidden =
    failureMap[failure]?.find((j) => j.jobId === job.id)?.hidden || false;

  const handleHideChange = (checked: boolean) => {
    console.log({ checked, failure, jobId: job.id });
    onHide(failure, job.id, checked);
  };

  return (
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
      <TableCell>{job.branch}</TableCell>
      <TableCell>{job.failedStep?.name}</TableCell>
      <TableCell>{new Date(job.started_at).toLocaleString()}</TableCell>
      <TableCell className="max-w-48 overflow-x-auto">
        {isEditing ? (
          <Textarea
            value={inputValue}
            onChange={handleInputChange}
            className="w-full"
            placeholder="Enter failures separated by commas"
            rows={3}
          />
        ) : (
          <pre className="max-h-24 overflow-y-auto  ">
            {jobFailures.map((failure, index) => (
              <div key={index} className="mb-1 p-2 rounded-md bg-muted">
                {failure}
              </div>
            ))}
          </pre>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Button variant="outline" size="sm" onClick={handleSave}>
            Save
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStartEditing(jobName, job.id)}
          >
            <PencilIcon className="w-4 h-4" />
            <span className="sr-only">Edit failure</span>
          </Button>
        )}
      </TableCell>
      <TableCell>
        {failure && failure !== "Unresolved" && (
          <Checkbox
            checked={isHidden}
            onCheckedChange={(checked) => {
              handleHideChange(checked as boolean);
            }}
          />
        )}
      </TableCell>
    </TableRow>
  );
}
