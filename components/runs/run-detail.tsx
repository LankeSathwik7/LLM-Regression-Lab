"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { toCurrency, toDateTime, toPercent } from "@/lib/utils";

type RunData = {
  run: {
    id: string;
    status: "queued" | "running" | "completed" | "failed";
    project_id: string;
    suite_id: string;
    suite_name: string;
    baseline_run_id: string | null;
    created_at: string;
    completed_at: string | null;
  };
  metrics: {
    pass_rate: number;
    avg_correctness: number;
    avg_latency_ms: number;
    p90_latency_ms: number;
    total_cost: number;
    pass_rate_delta: number | null;
  } | null;
};

type ResultData = {
  results: Array<{
    id: string;
    test_id: string;
    test_key: string;
    tags: string[] | null;
    status: "pass" | "fail" | "error";
    score: number | null;
    latency_ms: number | null;
    failure_reasons: string[] | null;
  }>;
};

export function RunDetail({ runId }: { runId: string }) {
  const [runData, setRunData] = useState<RunData | null>(null);
  const [results, setResults] = useState<ResultData["results"]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [failureFilter, setFailureFilter] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const load = useCallback(async () => {
    const [runRes, resultsRes] = await Promise.all([fetch(`/api/runs/${runId}`), fetch(`/api/runs/${runId}/results`)]);
    if (!runRes.ok || !resultsRes.ok) {
      setError("Unable to load run.");
      return;
    }
    const runBody = (await runRes.json()) as RunData;
    const resultsBody = (await resultsRes.json()) as ResultData;
    setRunData(runBody);
    setResults(resultsBody.results);
  }, [runId]);

  useEffect(() => {
    load().catch(() => setError("Unable to load run."));
  }, [load]);

  const tags = useMemo(() => [...new Set(results.flatMap((result) => result.tags ?? []))], [results]);

  const filtered = useMemo(() => {
    return results.filter((result) => {
      const statusOk = statusFilter === "all" || result.status === statusFilter;
      const tagOk = !tagFilter || (result.tags ?? []).includes(tagFilter);
      const failureOk = !failureFilter || (result.failure_reasons ?? []).some((reason) => reason.includes(failureFilter));
      return statusOk && tagOk && failureOk;
    });
  }, [results, statusFilter, tagFilter, failureFilter]);

  return (
    <AppLayout>
      <div className="space-y-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {!runData ? (
          <p className="text-sm text-slate-600">Loading run...</p>
        ) : (
          <>
            <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Run {runData.run.id.slice(0, 8)}</h1>
                <p className="text-sm text-slate-600">
                  Suite: {runData.run.suite_name} • Status: {runData.run.status} • Created {toDateTime(runData.run.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                {runData.run.baseline_run_id ? (
                  <Button variant="accent" onClick={() => router.push(`/runs/${runId}/diff/${runData.run.baseline_run_id}`)}>
                    Compare with baseline
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => router.push(`/projects/${runData.run.project_id}`)}>
                  Project
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Card>
                <CardHeader>
                  <CardTitle>Pass rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{toPercent(runData.metrics?.pass_rate)}</p>
                  <p className="text-xs text-slate-600">
                    Delta:{" "}
                    {runData.metrics?.pass_rate_delta === null || runData.metrics?.pass_rate_delta === undefined
                      ? "n/a"
                      : `${(runData.metrics.pass_rate_delta * 100).toFixed(1)}%`}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Avg correctness</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{(runData.metrics?.avg_correctness ?? 0).toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>p50 latency</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{Math.round(runData.metrics?.avg_latency_ms ?? 0)}ms</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>p90 latency</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{Math.round(runData.metrics?.p90_latency_ms ?? 0)}ms</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{toCurrency(runData.metrics?.total_cost)}</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 grid gap-2 md:grid-cols-4">
                  <Select
                    options={[
                      { value: "all", label: "All statuses" },
                      { value: "pass", label: "Pass" },
                      { value: "fail", label: "Fail" },
                      { value: "error", label: "Error" }
                    ]}
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  />
                  <Select
                    options={[
                      { value: "", label: "All tags" },
                      ...tags.map((tag) => ({ value: tag, label: tag }))
                    ]}
                    value={tagFilter}
                    onChange={(event) => setTagFilter(event.target.value)}
                  />
                  <Input placeholder="Failure type contains..." value={failureFilter} onChange={(e) => setFailureFilter(e.target.value)} />
                </div>
                <Table>
                  <thead>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Latency</TableHead>
                      <TableHead>Failure reason</TableHead>
                      <TableHead>Output</TableHead>
                    </TableRow>
                  </thead>
                  <tbody>
                    {filtered.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>{result.test_key}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              result.status === "pass" ? "success" : result.status === "fail" ? "danger" : "neutral"
                            }
                          >
                            {result.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{result.score?.toFixed(2) ?? "n/a"}</TableCell>
                        <TableCell>{result.latency_ms ?? 0}ms</TableCell>
                        <TableCell>{result.failure_reasons?.[0] ?? "n/a"}</TableCell>
                        <TableCell>
                          <Link className="underline-offset-2 hover:underline" href={`/tests/${result.test_id}?runId=${runId}`}>
                            View outputs
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
