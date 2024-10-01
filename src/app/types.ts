import { RestEndpointMethodTypes } from "@octokit/rest";

export type Workflow =
  RestEndpointMethodTypes["actions"]["listRepoWorkflows"]["response"]["data"]["workflows"][number];

export type WorkflowRunJob = {
  id: RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["response"]["data"]["jobs"][number]["id"];
  name: RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["response"]["data"]["jobs"][number]["name"];
  html_url: RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["response"]["data"]["jobs"][number]["html_url"];
  conclusion: RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["response"]["data"]["jobs"][number]["conclusion"];
  started_at: RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["response"]["data"]["jobs"][number]["started_at"];
  completed_at: RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["response"]["data"]["jobs"][number]["completed_at"];
  status: RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["response"]["data"]["jobs"][number]["status"];
  steps: RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["response"]["data"]["jobs"][number]["steps"];
};

export type WorkflowRun = {
  id: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number]["id"];
  name: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number]["name"];
  html_url: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number]["html_url"];
  conclusion: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number]["conclusion"];
  created_at: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number]["created_at"];
  updated_at: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number]["updated_at"];
  run_started_at: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number]["run_started_at"];
  status: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number]["status"];
  head_branch: RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number]["head_branch"];
  head_commit: {
    message: string | null | undefined;
    id: string | null | undefined;
  };
};
