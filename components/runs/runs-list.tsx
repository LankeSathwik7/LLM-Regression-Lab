"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { toDateTime, toPercent } from "@/lib/utils";

type Run = {
  id: string;
  suite_id: string;
  suite_name: string;
  status: "queued" | "running" | "completed" | "failed";
  created_at: string;
  pass_rate: number | null;
};

export function RunsList() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/runs")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load runs");
        const body = (await response.json()) as { runs: Run[] };
        setRuns(body.runs);
      })
      .catch(() => setError("Unable to load runs."));
  }, []);

  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
          <Table>
            <thead>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Suite</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pass rate</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </thead>
            <tbody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    <Link className="underline-offset-2 hover:underline" href={`/runs/${run.id}`}>
                      {run.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{run.suite_name}</TableCell>
                  <TableCell>{run.status}</TableCell>
                  <TableCell>{toPercent(run.pass_rate)}</TableCell>
                  <TableCell>{toDateTime(run.created_at)}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
