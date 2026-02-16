"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toDateTime } from "@/lib/utils";

type SuiteResponse = {
  suite: {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    tags: string[] | null;
    config_json: Record<string, unknown> | null;
  };
};

type TestResponse = {
  tests: Array<{
    id: string;
    key: string;
    description: string | null;
    tags: string[] | null;
    last_status: "pass" | "fail" | "error" | null;
  }>;
};

type RunResponse = {
  runs: Array<{
    id: string;
    status: "queued" | "running" | "completed" | "failed";
    model_name: string;
    created_at: string;
    pass_rate: number | null;
  }>;
};

export function SuiteDetail({ projectId, suiteId }: { projectId: string; suiteId: string }) {
  const [suite, setSuite] = useState<SuiteResponse["suite"] | null>(null);
  const [tests, setTests] = useState<TestResponse["tests"]>([]);
  const [runs, setRuns] = useState<RunResponse["runs"]>([]);
  const [error, setError] = useState("");
  const [newTest, setNewTest] = useState({
    key: "",
    description: "",
    input_json: '{"query":"What is the refund policy?"}',
    expectations_json: '{"required_keywords":["refund","policy"]}',
    tags: "normal"
  });
  const [savingTest, setSavingTest] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    const [suiteRes, testsRes, runsRes] = await Promise.all([
      fetch(`/api/suites/${suiteId}`),
      fetch(`/api/suites/${suiteId}/tests`),
      fetch(`/api/suites/${suiteId}/runs`)
    ]);
    if (!suiteRes.ok || !testsRes.ok || !runsRes.ok) {
      setError("Unable to load suite data.");
      return;
    }
    const suiteBody = (await suiteRes.json()) as SuiteResponse;
    const testsBody = (await testsRes.json()) as TestResponse;
    const runsBody = (await runsRes.json()) as RunResponse;
    setSuite(suiteBody.suite);
    setTests(testsBody.tests);
    setRuns(runsBody.runs);
  }, [suiteId]);

  useEffect(() => {
    load().catch(() => setError("Unable to load suite data."));
  }, [load]);

  const yamlText = useMemo(() => JSON.stringify(suite?.config_json ?? {}, null, 2), [suite?.config_json]);

  async function addTest(event: FormEvent) {
    event.preventDefault();
    setSavingTest(true);
    setError("");
    const response = await fetch(`/api/suites/${suiteId}/tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: newTest.key,
        description: newTest.description || null,
        input: JSON.parse(newTest.input_json),
        expectations: JSON.parse(newTest.expectations_json),
        tags: newTest.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      })
    });

    setSavingTest(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Unable to add test.");
      return;
    }

    setNewTest((prev) => ({ ...prev, key: "", description: "" }));
    await load();
  }

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{suite?.name ?? "Suite"}</h1>
            <p className="text-sm text-slate-600">{suite?.description ?? "No description"}</p>
            <div className="mt-2 flex gap-2">
              {(suite?.tags ?? []).map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            Back to project
          </Button>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Tabs defaultValue="tests">
          <TabsList>
            <TabsTrigger value="tests">Tests</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="yaml">YAML</TabsTrigger>
          </TabsList>
          <TabsContent value="tests" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <thead>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Last status</TableHead>
                    </TableRow>
                  </thead>
                  <tbody>
                    {tests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell>
                          <Link className="underline-offset-2 hover:underline" href={`/tests/${test.id}`}>
                            {test.key}
                          </Link>
                        </TableCell>
                        <TableCell>{test.description ?? "n/a"}</TableCell>
                        <TableCell>{(test.tags ?? []).join(", ") || "none"}</TableCell>
                        <TableCell>{test.last_status ?? "never"}</TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Add test</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-3 md:grid-cols-2" onSubmit={addTest}>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Test key</label>
                    <Input
                      value={newTest.key}
                      onChange={(event) => setNewTest((prev) => ({ ...prev, key: event.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Tags (comma separated)</label>
                    <Input
                      value={newTest.tags}
                      onChange={(event) => setNewTest((prev) => ({ ...prev, tags: event.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-slate-700">Description</label>
                    <Input
                      value={newTest.description}
                      onChange={(event) => setNewTest((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-slate-700">Input (JSON)</label>
                    <Textarea
                      className="font-mono"
                      value={newTest.input_json}
                      onChange={(event) => setNewTest((prev) => ({ ...prev, input_json: event.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm text-slate-700">Expectations (JSON)</label>
                    <Textarea
                      className="font-mono"
                      value={newTest.expectations_json}
                      onChange={(event) => setNewTest((prev) => ({ ...prev, expectations_json: event.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={savingTest}>
                      {savingTest ? "Adding..." : "Add test"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="runs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Run history</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <thead>
                    <TableRow>
                      <TableHead>Run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Pass rate</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <Link href={`/runs/${run.id}`}>{run.id.slice(0, 8)}</Link>
                        </TableCell>
                        <TableCell>{run.status}</TableCell>
                        <TableCell>{run.model_name}</TableCell>
                        <TableCell>{run.pass_rate === null ? "n/a" : `${(run.pass_rate * 100).toFixed(1)}%`}</TableCell>
                        <TableCell>{toDateTime(run.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="yaml" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Canonical YAML/JSON</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">{yamlText}</pre>
                <p className="mt-3 text-sm text-slate-600">
                  Edit via Git/CLI for reviewable suite changes and then sync back through API.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
