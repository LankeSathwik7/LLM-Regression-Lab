"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

type TestDetailResponse = {
  test: {
    id: string;
    key: string;
    description: string | null;
    tags: string[] | null;
    input: Record<string, unknown>;
    expectations: Record<string, unknown>;
  };
  runs: Array<{ id: string; label: string }>;
};

type TestResultResponse = {
  result: {
    status: "pass" | "fail" | "error";
    scores: Record<string, number> | null;
    failure_reasons: string[] | null;
    raw_output: Record<string, unknown> | null;
    judge_explanation: string | null;
    checks: Array<{ rule: string; status: "pass" | "fail"; message: string }>;
  } | null;
};

export function TestDetail({ testId }: { testId: string }) {
  const [data, setData] = useState<TestDetailResponse | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [result, setResult] = useState<TestResultResponse["result"]>(null);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch(`/api/tests/${testId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load test");
        const body = (await response.json()) as TestDetailResponse;
        const runIdFromQuery = searchParams.get("runId");
        setData(body);
        setSelectedRunId(runIdFromQuery ?? body.runs[0]?.id ?? "");
      })
      .catch(() => setError("Unable to load test."));
  }, [testId, searchParams]);

  useEffect(() => {
    if (!selectedRunId) return;
    fetch(`/api/tests/${testId}/results?runId=${selectedRunId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load result");
        const body = (await response.json()) as TestResultResponse;
        setResult(body.result);
      })
      .catch(() => setError("Unable to load result."));
  }, [selectedRunId, testId]);

  return (
    <AppLayout>
      <div className="space-y-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {!data ? (
          <p className="text-sm text-slate-600">Loading test...</p>
        ) : (
          <>
            <div className="panel p-5">
              <h1 className="text-2xl font-semibold text-slate-900">{data.test.key}</h1>
              <p className="text-sm text-slate-600">{data.test.description ?? "No description"}</p>
              <div className="mt-2 flex gap-2">
                {(data.test.tags ?? []).map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Test definition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="mb-1 text-sm font-semibold text-slate-700">Input</p>
                  <pre className="code-block rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
                    {JSON.stringify(data.test.input, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold text-slate-700">Expectations</p>
                  <pre className="code-block rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
                    {JSON.stringify(data.test.expectations, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Outputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Run</label>
                  <Select
                    options={data.runs.map((run) => ({ value: run.id, label: run.label }))}
                    value={selectedRunId}
                    onChange={(event) => setSelectedRunId(event.target.value)}
                  />
                </div>
                <pre className="code-block rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
                  {JSON.stringify(result?.raw_output ?? {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Evaluation breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant={result?.status === "pass" ? "success" : "danger"}>{result?.status ?? "n/a"}</Badge>
                <div>
                  <p className="mb-1 text-sm font-semibold text-slate-700">Constraint checks</p>
                  <div className="space-y-2">
                    {(result?.checks ?? []).map((check) => (
                      <div key={check.rule} className="rounded-lg border border-slate-200 p-2 text-sm">
                        <div className="font-medium">{check.rule}</div>
                        <div className="text-slate-600">
                          {check.status}: {check.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold text-slate-700">Scores</p>
                  <pre className="code-block rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
                    {JSON.stringify(result?.scores ?? {}, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold text-slate-700">Judge explanation</p>
                  <p className="text-sm text-slate-700">{result?.judge_explanation ?? "No judge explanation."}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

