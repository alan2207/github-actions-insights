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
