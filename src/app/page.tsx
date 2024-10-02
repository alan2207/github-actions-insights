"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  useBranch,
  useConclusion,
  useDateRange,
  useOwner,
  useRepo,
  useWorkflowId,
  useWorkflowRuns,
  useWorkflows,
} from "./data";
import { StatusBadge } from "./_components/status-badge";
import { formatDuration, useDebounce } from "./utils";
import { ApiKeyManager } from "./_components/api-key-manager";
import { GenerateReport } from "./_components/generate-report";
import { Export } from "./_components/export";

const formatDateRange = (dateRange: DateRange | undefined) => {
  if (!dateRange) return undefined;
  return {
    from: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    to: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  };
};

export default function GitHubActionsInspector() {
  const [owner, setOwner] = useOwner();
  const [repo, setRepo] = useRepo();
  const [workflowId, setWorkflowId] = useWorkflowId();
  const [formattedDateRange, setFormattedDateRange] = useDateRange();
  const [conclusion, setConclusion] = useConclusion();

  // Local state for immediate input display
  const [localOwner, setLocalOwner] = useState(owner ?? "");
  const [localRepo, setLocalRepo] = useState(repo ?? "");
  const [localWorkflowId, setLocalWorkflowId] = useState(
    workflowId?.toString() ?? ""
  );
  const [localConclusion, setLocalConclusion] = useState(conclusion ?? "");

  // Debounced setters
  const debouncedSetOwner = useDebounce(setOwner, 300);
  const debouncedSetRepo = useDebounce(setRepo, 300);
  const debouncedSetWorkflowId = useDebounce(
    (value: string) => setWorkflowId(+value),
    300
  );
  const debouncedSetConclusion = useDebounce(setConclusion, 300);

  // Update handlers
  const handleOwnerChange = useCallback(
    (value: string) => {
      setLocalOwner(value);
      debouncedSetOwner(value);
    },
    [debouncedSetOwner]
  );

  const handleRepoChange = useCallback(
    (value: string) => {
      setLocalRepo(value);
      debouncedSetRepo(value);
    },
    [debouncedSetRepo]
  );

  const handleWorkflowIdChange = useCallback(
    (value: string) => {
      setLocalWorkflowId(value);
      debouncedSetWorkflowId(value);
    },
    [debouncedSetWorkflowId]
  );

  const handleConclusionChange = useCallback(
    (value: string) => {
      setLocalConclusion(value);
      debouncedSetConclusion(value);
    },
    [debouncedSetConclusion]
  );

  const [selectedRuns, setSelectedRuns] = useState<number[]>([]);
  const [lastClickedRunId, setLastClickedRunId] = useState<number | null>(null);
  const [branch, setBranch] = useBranch();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const [from, to] = formattedDateRange?.split("..") ?? [];
    return {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };
  });

  useEffect(() => {
    const formattedDateRange = formatDateRange(dateRange);

    if (!formattedDateRange?.from || !formattedDateRange?.to) {
      return;
    }

    setFormattedDateRange(
      `${formattedDateRange?.from}..${formattedDateRange?.to}`
    );
  }, [dateRange, setFormattedDateRange]);

  const workflowsQuery = useWorkflows();
  const workflows = workflowsQuery.data?.workflows;

  const workflowRunsQuery = useWorkflowRuns({
    per_page: 100,
  });
  const workflowRuns = workflowRunsQuery.data?.pages.flatMap(
    (page) => page.workflow_runs
  );

  useEffect(() => {
    if (
      !workflowRunsQuery.isFetching &&
      !workflowRunsQuery.isFetchingNextPage &&
      workflowRunsQuery.hasNextPage
    ) {
      workflowRunsQuery.fetchNextPage();
    }
  }, [workflowRunsQuery]);

  const toggleRunSelection = (runId: number) => {
    setSelectedRuns((prevSelectedRuns) => {
      if (prevSelectedRuns.includes(runId)) {
        return prevSelectedRuns.filter((id) => id !== runId);
      }
      return [...prevSelectedRuns, runId];
    });
  };

  const toggleAllRuns = () => {
    setSelectedRuns((prevSelectedRuns) => {
      if (prevSelectedRuns.length === workflowRuns?.length) {
        return [];
      } else {
        return workflowRuns?.map((run) => run.id) || [];
      }
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">GitHub Actions Insights</h1>
        <ApiKeyManager />
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              placeholder="GitHub Owner"
              value={localOwner}
              onChange={(e) => handleOwnerChange(e.target.value)}
            />
            <Input
              placeholder="GitHub Repo"
              value={localRepo}
              onChange={(e) => handleRepoChange(e.target.value)}
            />
            <Select
              value={localWorkflowId}
              onValueChange={handleWorkflowIdChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a workflow" />
              </SelectTrigger>
              <SelectContent>
                {workflows?.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id.toString()}>
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex justify-between items-center mb-4">
            <span>Workflow Runs</span>
            <div className="flex items-center space-x-2 gap-3">
              {workflowRuns && (
                <GenerateReport
                  workflowRuns={workflowRuns?.filter((run) =>
                    selectedRuns.includes(run.id)
                  )}
                />
              )}
              {workflowRuns && (
                <Export
                  name={`${owner}-${repo}-workflow_runs-${
                    branch || "all-branches"
                  }-${formattedDateRange}-${conclusion}`}
                  disabled={selectedRuns.length === 0}
                  generateJSONContent={() =>
                    JSON.stringify(
                      workflowRuns?.filter((run) =>
                        selectedRuns.includes(run.id)
                      ),
                      null,
                      2
                    )
                  }
                  generateCSVContent={() => {
                    const headers = [
                      "Run ID",
                      "Status",
                      "Conclusion",
                      "Branch",
                      "Commit ID",
                      "Started At",
                      "Updated At",
                    ];

                    const csv = [
                      headers.join(","),
                      ...(workflowRuns
                        ?.filter((run) => selectedRuns.includes(run.id))
                        .map((run) =>
                          [
                            run.id,
                            run.status,
                            run.conclusion,
                            run.head_branch,
                            run.head_commit?.id,
                            run.run_started_at,
                            run.updated_at,
                          ].join(",")
                        ) ?? []),
                    ].join("\n");
                    return csv;
                  }}
                />
              )}
            </div>
          </CardTitle>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Select
              value={localConclusion}
              onValueChange={handleConclusionChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by conclusion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={branch ?? ""}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="Filter by branch name"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !dateRange?.from && !dateRange?.to
                      ? "text-muted-foreground"
                      : ""
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange?.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Pick a date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        {(workflowRuns?.length || 0) > 0 && (
          <CardContent className="overflow-hidden">
            <div className="overflow-auto h-[calc(100vh-470px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] sticky top-0 bg-background z-10">
                      <Checkbox
                        checked={workflowRuns?.length === selectedRuns.length}
                        onCheckedChange={toggleAllRuns}
                      />
                    </TableHead>
                    <TableHead className="bg-background z-10">Run #</TableHead>
                    <TableHead className="bg-background z-10">Status</TableHead>
                    <TableHead className="bg-background z-10">
                      Conclusion
                    </TableHead>
                    <TableHead className="bg-background z-10">Branch</TableHead>
                    <TableHead className="bg-background z-10">Commit</TableHead>
                    <TableHead className="bg-background z-10">
                      Started At
                    </TableHead>
                    <TableHead className="bg-background z-10">
                      Duration
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflowRuns?.map((run) => {
                    const startedAt = run.run_started_at
                      ? new Date(run.run_started_at)
                      : null;
                    const updatedAt = run.updated_at
                      ? new Date(run.updated_at)
                      : null;
                    const duration =
                      !updatedAt || !startedAt
                        ? 0
                        : (updatedAt.getTime() - startedAt.getTime()) / 1000; // duration in seconds
                    return (
                      <TableRow
                        key={run.id}
                        onClick={() => setLastClickedRunId(run.id)}
                        className={
                          lastClickedRunId === run.id ? "bg-gray-200" : ""
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedRuns.includes(run.id)}
                            onCheckedChange={() => toggleRunSelection(run.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <a
                            href={run.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {run.id}
                          </a>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={run.status} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={run.conclusion} />{" "}
                        </TableCell>
                        <TableCell>{run.head_branch}</TableCell>
                        <TableCell>
                          <a
                            href={`https://github.com/${owner}/${repo}/commit/${run.head_commit?.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {run.head_commit?.message?.slice(0, 20)}...
                          </a>
                        </TableCell>
                        <TableCell>{startedAt?.toLocaleString()}</TableCell>
                        <TableCell>{formatDuration(duration)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
        <CardFooter className="text-sm">
          {selectedRuns.length} of {workflowRuns?.length} Selected
        </CardFooter>
      </Card>
    </div>
  );
}
