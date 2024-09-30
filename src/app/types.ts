import { RestEndpointMethodTypes } from "@octokit/rest";


export type Workflow =
  RestEndpointMethodTypes["actions"]["listRepoWorkflows"]["response"]["data"]["workflows"][number];

export type WorkflowRunJob = {
  id: number;
  name: string;
  html_url: string;
  conclusion: string;
  started_at: string;
  completed_at: string;
  status: string;
};

export type WorkflowRun = {
    id: number;
    name: string | null | undefined;
    html_url: string;
    conclusion: string | null;
    created_at: string;
    updated_at: string;
    run_started_at: string | undefined;
    status: string | null;
    head_branch: string | null | undefined;
    head_commit: {
      message: string | null | undefined;
      id: string | null | undefined;
    };
  };