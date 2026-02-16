"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/layout";
import { MetricLineChart } from "@/components/charts/metric-line-chart";
import { RunSuiteModal } from "@/components/suites/run-suite-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { toDateTime, toPercent } from "@/lib/utils";

type OverviewResponse = {
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  recent_runs: Array<{
    id: string;
    suite_id: string;
    suite_name: string;
    model_name: string;
    pass_rate: number;
    avg_latency_ms: number;
    total_cost: number;
    created_at: string;
    status: "queued" | "running" | "completed" | "failed";
  }>;
  suites: Array<{
    id: string;
    name: string;
    description: string | null;
    tags: string[] | null;
    last_run_status: "queued" | "running" | "completed" | "failed" | null;
    last_run_id: string | null;
  }>;
};

export function ProjectDashboard({ projectId }: { projectId: string }) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}/overview`);
    if (!response.ok) {
      setError("Unable to load project overview.");
      return;
    }
    const body = (await response.json()) as OverviewResponse;
    setData(body);
  }, [projectId]);

  useEffect(() => {
    load().catch(() => setError("Unable to load project overview."));
  }, [load]);

  const passRateChart = useMemo(
    () =>
      (data?.recent_runs ?? []).map((run) => ({
        label: new Date(run.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: Number((run.pass_rate * 100).toFixed(2))
      })),
    [data]
  );

  const latencyChart = useMemo(
    () =>
      (data?.recent_runs ?? []).map((run) => ({
        label: new Date(run.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: run.avg_latency_ms
      })),
    [data]
  );

  const costChart = useMemo(
    () =>
      (data?.recent_runs ?? []).map((run) => ({
        label: new Date(run.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: run.total_cost
      })),
    [data]
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {!data ? (
          <p className="text-sm text-slate-600">Loading project...</p>
        ) : (
          <>
            <div className="panel flex flex-wrap items-center justify-between gap-2 p-5">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{data.project.name}</h1>
                <p className="text-sm text-slate-600">{data.project.description ?? "No project description set."}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push("/projects")}>
                Back to projects
              </Button>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent runs</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <thead>
                      <TableRow>
                        <TableHead>Suite</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Pass rate</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </thead>
                    <tbody>
                      {data.recent_runs.map((run) => (
                        <TableRow key={run.id}>
                          <TableCell>
                            <Link className="text-slate-900 underline-offset-2 hover:underline" href={`/runs/${run.id}`}>
                              {run.suite_name}
                            </Link>
                          </TableCell>
                          <TableCell>{run.model_name}</TableCell>
                          <TableCell>{toPercent(run.pass_rate)}</TableCell>
                          <TableCell>{toDateTime(run.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </tbody>
                  </Table>
                </CardContent>
              </Card>
              <div className="grid gap-4">
                <MetricLineChart title="Pass rate over time (%)" data={passRateChart} color="#0f766e" />
                <MetricLineChart title="Average latency over time (ms)" data={latencyChart} color="#f97316" />
                <MetricLineChart title="Cost over time (USD)" data={costChart} color="#7f1d1d" />
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Test suites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {data.suites.map((suite) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                      key={suite.id}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{suite.name}</p>
                        <p className="text-xs text-slate-600">{suite.description ?? "No description."}</p>
                        <div className="mt-2 flex gap-2">
                          {(suite.tags ?? []).map((tag) => (
                            <Badge key={tag} variant="default">
                              {tag}
                            </Badge>
                          ))}
                          <Badge
                            variant={
                              suite.last_run_status === "completed"
                                ? "success"
                                : suite.last_run_status === "failed"
                                  ? "danger"
                                  : "neutral"
                            }
                          >
                            {suite.last_run_status ?? "never run"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <RunSuiteModal
                          suiteId={suite.id}
                          baselineOptions={data.recent_runs.map((run) => ({ id: run.id, label: `${run.id.slice(0, 8)} (${run.suite_name})` }))}
                          onCreated={(runId) => router.push(`/runs/${runId}`)}
                        />
                        <Button size="sm" variant="outline" onClick={() => router.push(`/projects/${projectId}/suites/${suite.id}`)}>
                          View suite
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
