import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { API_KEY_KEY } from "./_components/api-key-manager";
import { WorkflowRunJob } from "./types";

export const useOwner = () => {
  return useQueryState("owner", parseAsString);
};

export const useRepo = () => {
  return useQueryState("repo", parseAsString);
};

export const useWorkflowId = () => {
  return useQueryState("workflowId", parseAsInteger);
};

export const useWorkflowRunId = () => {
  return useQueryState("runId", parseAsInteger);
};

export const useDateRange = () => {
  return useQueryState("dateRange", parseAsString);
};

export const useBranch = () => {
  return useQueryState("branch", parseAsString);
};

export const useConclusion = () => {
  return useQueryState("conclusion", parseAsString);
};

export const octokit = new Octokit({
  auth:
    typeof window !== "undefined"
      ? window.localStorage.getItem(API_KEY_KEY)
      : "",
});

export const useWorkflows = () => {
  const [owner] = useOwner();
  const [repo] = useRepo();
  return useQuery({
    queryKey: ["workflows", owner, repo],
    queryFn: async () => {
      const res = await octokit.actions.listRepoWorkflows({
        owner: owner ?? "",
        repo: repo ?? "",
      });
      return res.data;
    },
    enabled: Boolean(owner && repo),
  });
};

export const useWorkflowRuns = ({ per_page = 100 }: { per_page?: number }) => {
  const [workflowId] = useWorkflowId();
  const [owner] = useOwner();
  const [repo] = useRepo();
  const [branch] = useBranch();
  const [conclusion] = useConclusion();
  const [dateRange] = useDateRange();
  return useInfiniteQuery({
    queryKey: [
      "workflowRuns",
      owner,
      repo,
      workflowId,
      {
        branch,
        conclusion,
        dateRange,
        per_page,
      },
    ],
    queryFn: async ({ pageParam }) => {
      const res = await octokit.actions.listWorkflowRuns({
        owner: owner ?? "",
        repo: repo ?? "",
        workflow_id: workflowId ?? 0,
        page: pageParam,
        per_page,
        branch: branch ?? "",
        status: (conclusion === "all" ? "" : conclusion ?? "") as any,
        created: dateRange ?? "",
      });
      return {
        total_count: res.data.total_count,
        workflow_runs: res.data.workflow_runs.map((run) => ({
          id: run.id,
          name: run.name,
          html_url: run.html_url,
          conclusion: run.conclusion,
          created_at: run.created_at,
          updated_at: run.updated_at,
          run_started_at: run.run_started_at,
          status: run.status,
          head_branch: run.head_branch,
          head_commit: {
            message: run.head_commit?.message,
            id: run.head_commit?.id,
          },
        })),
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalFetchedItems = allPages.reduce(
        (sum, page) => sum + page.workflow_runs.length,
        0
      );
      const hasMoreItems = totalFetchedItems < lastPage.total_count;

      if (!hasMoreItems) {
        return null;
      }

      return allPages.length + 1;
    },
    initialPageParam: 1,
    enabled: Boolean(owner && repo && workflowId),
  });
};

export const getWorkflowRunJobs = async ({
  runId,
  owner,
  repo,
  page = 1,
  per_page = 100,
}: {
  runId: number | null;
  owner: string | null;
  repo: string | null;
  page?: number;
  per_page?: number;
}) => {
  if (!runId || !owner || !repo) {
    return {
      jobs: [] as WorkflowRunJob[],
      total_count: 0,
    };
  }
  const res = await octokit.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: runId,
    page,
    per_page,
  });
  return {
    total_count: res.data.total_count,
    jobs: res.data.jobs.map((job) => ({
      id: job.id,
      name: job.name,
      html_url: job.html_url,
      conclusion: job.conclusion,
      started_at: job.started_at,
      completed_at: job.completed_at,
      status: job.status,
      steps: job.steps,
    })),
  };
};

export const useWorkflowRunJobs = ({
  page = 1,
  per_page = 100,
}: {
  page?: number;
  per_page?: number;
}) => {
  const [runId] = useWorkflowRunId();
  const [owner] = useOwner();
  const [repo] = useRepo();
  return useQuery({
    queryKey: [
      "workflowRunJobs",
      owner,
      repo,
      runId,
      {
        page,
        per_page,
      },
    ],
    queryFn: async () => {
      return getWorkflowRunJobs({
        runId,
        owner,
        repo,
        page,
        per_page,
      });
    },
    enabled: Boolean(owner && repo && runId),
  });
};

type FailureInfo = {
  lineNumbers: number[];
  context: string;
  keyword: string;
  severity: string;
  occurrences: number;
};

const stripLineInfo = (line: string) => {
  // Replace digits in the datetime prefix with 'X'
  let strippedLine = line.replace(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s+/,
    (match) => match.replace(/\d/g, "X")
  );

  // Replace artifact ID in the name more generically
  strippedLine = strippedLine.replace(
    /(\bname:\s+.*-pw-)\d+(-\d+-[a-f0-9]+)(\.tar\.gz)/,
    "$1XXXXXXXXXX-X-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX$3"
  );

  return strippedLine;
};

const findFailureInLogs = (logContent: string) => {
  const lines = logContent.split("\n");
  const errorKeywords = [
    "error",
    "failed",
    "exception",
    "fatal",
    "crash",
    "unexpected",
  ];
  const contextSize = 3;

  const failureMap = new Map<string, FailureInfo>();

  lines.forEach((line, index) => {
    const strippedLine = stripLineInfo(line);
    const lowerCaseLine = strippedLine.toLowerCase();

    // Use a regular expression to match keywords case-insensitively
    const matchedKeyword = errorKeywords.find((keyword) =>
      new RegExp(`\\b${keyword}\\b`, "i").test(strippedLine)
    );

    if (matchedKeyword) {
      const contextLines = lines
        .slice(
          Math.max(0, index - contextSize),
          Math.min(lines.length, index + contextSize + 1)
        )
        .map(stripLineInfo);
      const context = contextLines.join("\n");

      // Create a unique key for similar contexts
      const contextKey = context.toLowerCase();

      if (failureMap.has(contextKey)) {
        const existingFailure = failureMap.get(contextKey)!;
        existingFailure.lineNumbers.push(index + 1);
        existingFailure.occurrences++;
      } else {
        failureMap.set(contextKey, {
          lineNumbers: [index + 1],
          context,
          keyword: matchedKeyword,
          severity: getSeverity(matchedKeyword),
          occurrences: 1,
        });
      }
    }
  });

  const groupedFailures = Array.from(failureMap.values());
  return groupedFailures.length > 0 ? groupedFailures : null;
};

const getSeverity = (keyword: string): string => {
  switch (keyword) {
    case "fatal":
    case "crash":
      return "critical";
    case "error":
    case "exception":
      return "high";
    case "failed":
    case "unexpected":
      return "medium";
    default:
      return "low";
  }
};

export const useJobLogs = ({
  jobId,
  isPreviewOpen,
  started_at,
  completed_at,
}: {
  jobId: number;
  isPreviewOpen: boolean;
  started_at: string | null;
  completed_at: string | null;
}) => {
  const [owner] = useOwner();
  const [repo] = useRepo();

  return useQuery({
    queryKey: ["jobLogs", jobId, started_at, completed_at],
    gcTime: 0,
    queryFn: async () => {
      const res = await octokit.actions.downloadJobLogsForWorkflowRun({
        owner: owner ?? "",
        repo: repo ?? "",
        job_id: jobId,
      });

      const response = await fetch(res.url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const fullLogs = await response.text();

      // Filter logs based on started_at and completed_at
      const filteredLogs = filterLogsByDateRange(
        fullLogs,
        started_at,
        completed_at
      );

      // Remove content between "##[group]Fetching the repository" and the next "##[endgroup]"
      const modifiedLogs = filteredLogs.replace(
        /##\[group\]Fetching the repository[\s\S]*?##\[endgroup\]/,
        ""
      );

      return findFailureInLogs(modifiedLogs);
    },
    enabled: isPreviewOpen,
  });
};

function filterLogsByDateRange(
  logs: string,
  started_at: string | null,
  completed_at: string | null
): string {
  if (!started_at || !completed_at) return logs;

  const lines = logs.split("\n");
  const startDate = new Date(started_at);
  const endDate = new Date(completed_at);

  // Pad the start date by subtracting 100 milliseconds
  startDate.setMilliseconds(startDate.getMilliseconds() - 300);
  // Pad the end date by adding 10 milliseconds
  endDate.setMilliseconds(endDate.getMilliseconds() + 300);

  const filteredLines = lines.filter((line) => {
    // return true;
    const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)/);
    if (match) {
      const lineDate = new Date(match[1]);
      return lineDate >= startDate && lineDate <= endDate;
    }
    return false;
  });

  return filteredLines.join("\n");
}
