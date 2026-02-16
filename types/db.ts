export type RunStatus = "queued" | "running" | "completed" | "failed";
export type ResultStatus = "pass" | "fail" | "error";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface Suite {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  config_json: Record<string, unknown> | null;
  created_at: string;
}

export interface TestCase {
  id: string;
  suite_id: string;
  key: string;
  description: string | null;
  input: Record<string, unknown>;
  expectations: Record<string, unknown>;
  tags: string[] | null;
  created_at: string;
}

export interface Run {
  id: string;
  project_id: string;
  suite_id: string;
  baseline_run_id: string | null;
  git_branch: string | null;
  git_commit: string | null;
  status: RunStatus;
  triggered_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface RunConfig {
  id: string;
  run_id: string;
  model_name: string;
  temperature: number | null;
  extra_params: Record<string, unknown> | null;
}

export interface ResultRow {
  id: string;
  run_id: string;
  run_config_id: string;
  test_id: string;
  status: ResultStatus;
  scores: Record<string, unknown> | null;
  failure_reasons: string[] | null;
  raw_input: Record<string, unknown> | null;
  raw_output: Record<string, unknown> | null;
  latency_ms: number | null;
  cost: number | null;
  created_at: string;
}

export interface RunMetric {
  run_id: string;
  run_config_id: string;
  project_id: string;
  pass_rate: number;
  avg_correctness: number;
  avg_latency_ms: number;
  total_cost: number;
  created_at: string;
}
