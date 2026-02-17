"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/layout";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NewProjectModal } from "@/components/projects/new-project-modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toDateTime, toPercent } from "@/lib/utils";

type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  latest_run_at: string | null;
  latest_pass_rate: number | null;
  trend_direction: "up" | "down" | "flat";
};

export function ProjectsView() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/projects");
    if (!response.ok) {
      setError("Unable to load projects.");
      setLoading(false);
      return;
    }
    const body = (await response.json()) as { projects: ProjectListItem[] };
    setProjects(body.projects);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setError("Unable to load projects."));
  }, []);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Projects ??</h1>
            <p className="text-sm text-slate-600">Monitor quality trends and run eval suites before every release.</p>
          </div>
          <div className="flex items-center gap-2">
            <NewProjectModal onCreated={load} />
            <SignOutButton />
          </div>
        </div>
        {loading ? <p className="text-sm text-slate-600">Loading projects...</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-xl">
                <CardHeader>
                  <CardTitle>{project.name}</CardTitle>
                  <CardDescription>{project.description ?? "No description."}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Latest pass rate</span>
                    <span className="font-semibold">{toPercent(project.latest_pass_rate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Trend</span>
                    <Badge
                      variant={
                        project.trend_direction === "up"
                          ? "success"
                          : project.trend_direction === "down"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {project.trend_direction}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">Last run: {toDateTime(project.latest_run_at)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

