"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";

export function NewProjectModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description })
    });
    setSaving(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Unable to create project");
      return;
    }

    setName("");
    setDescription("");
    setOpen(false);
    onCreated();
  }

  return (
    <>
      <Button variant="accent" onClick={() => setOpen(true)}>
        New Project
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create new project">
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Project name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer Support Bot" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this LLM app do?"
            />
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
