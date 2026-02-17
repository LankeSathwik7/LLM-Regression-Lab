"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { toCurrency, toPercent } from "@/lib/utils";

type DiffRow = {
  test_id: string;
  test_key: string;
  baseline_status: "pass" | "fail" | "error";
  candidate_status: "pass" | "fail" | "error";
  baseline_score: number | null;
  candidate_score: number | null;
  summary: string;
  baseline_output: string;
  candidate_output: string;
  baseline_explanation: string;
  candidate_explanation: string;
};

type DiffResponse = {
  run_id: string;
  baseline_id: string;
  summary: {
    baseline_pass_rate: number;
    candidate_pass_rate: number;
    pass_rate_delta: number;
    baseline_latency: number;
    candidate_latency: number;
    latency_delta: number;
    baseline_cost: number;
    candidate_cost: number;
    cost_delta: number;
  };
  regressions: DiffRow[];
  improvements: DiffRow[];
};

export function RunDiffView({ runId, baselineId }: { runId: string; baselineId: string }) {
  const [data, setData] = useState<DiffResponse | null>(null);
  const [selected, setSelected] = useState<DiffRow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/runs/${runId}/diff/${baselineId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load diff");
        }
        setData((await response.json()) as DiffResponse);
      })
      .catch(() => setError("Unable to load diff."));
  }, [runId, baselineId]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="panel p-5">
          <h1 className="text-2xl font-semibold">Run {runId.slice(0, 8)} vs {baselineId.slice(0, 8)}</h1>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {!data ? (
          <p className="text-sm text-slate-600">Loading diff...</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Pass rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">
                    {toPercent(data.summary.baseline_pass_rate)} to {toPercent(data.summary.candidate_pass_rate)}
                  </p>
                  <p className="text-xl font-semibold">{(data.summary.pass_rate_delta * 100).toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Latency</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">
                    {Math.round(data.summary.baseline_latency)}ms to {Math.round(data.summary.candidate_latency)}ms
                  </p>
                  <p className="text-xl font-semibold">{Math.round(data.summary.latency_delta)}ms</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">
                    {toCurrency(data.summary.baseline_cost)} to {toCurrency(data.summary.candidate_cost)}
                  </p>
                  <p className="text-xl font-semibold">{(data.summary.cost_delta * 100).toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Regressions (pass to fail)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <thead>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Old score</TableHead>
                      <TableHead>New score</TableHead>
                      <TableHead>Cause</TableHead>
                    </TableRow>
                  </thead>
                  <tbody>
                    {data.regressions.map((row) => (
                      <TableRow key={row.test_id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(row)}>
                        <TableCell>{row.test_key}</TableCell>
                        <TableCell>{row.baseline_score?.toFixed(2) ?? "n/a"}</TableCell>
                        <TableCell>{row.candidate_score?.toFixed(2) ?? "n/a"}</TableCell>
                        <TableCell>{row.summary}</TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Improvements (fail to pass)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <thead>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Old score</TableHead>
                      <TableHead>New score</TableHead>
                      <TableHead>Cause</TableHead>
                    </TableRow>
                  </thead>
                  <tbody>
                    {data.improvements.map((row) => (
                      <TableRow key={row.test_id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(row)}>
                        <TableCell>{row.test_key}</TableCell>
                        <TableCell>{row.baseline_score?.toFixed(2) ?? "n/a"}</TableCell>
                        <TableCell>{row.candidate_score?.toFixed(2) ?? "n/a"}</TableCell>
                        <TableCell>{row.summary}</TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </CardContent>
            </Card>
            <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.test_key ?? "Comparison"} className="max-w-5xl">
              {selected ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Baseline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge variant={selected.baseline_status === "pass" ? "success" : "danger"}>{selected.baseline_status}</Badge>
                      <pre className="code-block rounded-xl bg-slate-900 p-3 text-xs text-slate-100">{selected.baseline_output}</pre>
                      <p className="text-sm text-slate-700">{selected.baseline_explanation}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Candidate</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge variant={selected.candidate_status === "pass" ? "success" : "danger"}>{selected.candidate_status}</Badge>
                      <pre className="code-block rounded-xl bg-slate-900 p-3 text-xs text-slate-100">{selected.candidate_output}</pre>
                      <p className="text-sm text-slate-700">{selected.candidate_explanation}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </Modal>
          </>
        )}
      </div>
    </AppLayout>
  );
}

