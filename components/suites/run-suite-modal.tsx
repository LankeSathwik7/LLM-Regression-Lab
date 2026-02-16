"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

export function RunSuiteModal({
  suiteId,
  baselineOptions,
  onCreated
}: {
  suiteId: string;
  baselineOptions: Array<{ id: string; label: string }>;
  onCreated: (runId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [modelName, setModelName] = useState("llama-3.1-8b-instant");
  const [temperature, setTemperature] = useState("0.2");
  const [baselineRunId, setBaselineRunId] = useState<string>("none");
  const [gitBranch, setGitBranch] = useState("main");
  const [gitCommit, setGitCommit] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch(`/api/suites/${suiteId}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model_name: modelName,
        temperature: Number(temperature),
        baseline_run_id: baselineRunId === "none" ? null : baselineRunId,
        git_branch: gitBranch || null,
        git_commit: gitCommit || null
      })
    });

    const body = (await response.json().catch(() => ({}))) as { error?: string; run?: { id: string } };
    setSaving(false);

    if (!response.ok || !body.run) {
      setError(body.error ?? "Unable to start run");
      return;
    }

    setOpen(false);
    onCreated(body.run.id);
  }

  return (
    <>
      <Button size="sm" variant="accent" onClick={() => setOpen(true)}>
        Run suite
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Start suite run">
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Model</label>
            <Input value={modelName} onChange={(event) => setModelName(event.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Temperature</label>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={2}
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Baseline run</label>
            <Select
              options={[
                { value: "none", label: "No baseline" },
                ...baselineOptions.map((option) => ({ value: option.id, label: option.label }))
              ]}
              value={baselineRunId}
              onChange={(event) => setBaselineRunId(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Git branch</label>
            <Input value={gitBranch} onChange={(event) => setGitBranch(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Git commit</label>
            <Input value={gitCommit} onChange={(event) => setGitCommit(event.target.value)} />
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Starting..." : "Start run"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

