import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateOutput } from "@/lib/evals/evaluator";
import { runModel } from "@/lib/evals/provider";

type TriggerInput = {
  suiteId: string;
  userId: string;
  modelName: string;
  temperature: number;
  baselineRunId: string | null;
  gitBranch: string | null;
  gitCommit: string | null;
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function extractPrompt(inputJson: Record<string, unknown>): string {
  if (typeof inputJson.query === "string") return inputJson.query;
  if (typeof inputJson.prompt === "string") return inputJson.prompt;
  return JSON.stringify(inputJson);
}

export async function triggerSuiteRun(input: TriggerInput) {
  const supabase = createAdminClient();

  const { data: suite, error: suiteError } = await supabase
    .from("suites")
    .select("id, project_id")
    .eq("id", input.suiteId)
    .single();
  if (suiteError || !suite) {
    throw new Error("Suite not found.");
  }

  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      project_id: suite.project_id,
      suite_id: input.suiteId,
      baseline_run_id: input.baselineRunId,
      git_branch: input.gitBranch,
      git_commit: input.gitCommit,
      status: "running",
      triggered_by: input.userId
    })
    .select("id, project_id, suite_id")
    .single();

  if (runError || !run) {
    throw new Error(runError?.message ?? "Unable to create run.");
  }

  const { data: runConfig, error: configError } = await supabase
    .from("run_configs")
    .insert({
      run_id: run.id,
      model_name: input.modelName,
      temperature: input.temperature,
      extra_params: {}
    })
    .select("id")
    .single();

  if (configError || !runConfig) {
    throw new Error(configError?.message ?? "Unable to create run config.");
  }

  const { data: tests, error: testsError } = await supabase
    .from("tests")
    .select("id, key, input, expectations")
    .eq("suite_id", input.suiteId)
    .order("created_at", { ascending: true });

  if (testsError || !tests) {
    throw new Error(testsError?.message ?? "Unable to load tests.");
  }

  const latencies: number[] = [];
  const costs: number[] = [];
  const correctnessScores: number[] = [];
  let passCount = 0;

  try {
    for (const test of tests) {
      const prompt = extractPrompt((test.input ?? {}) as Record<string, unknown>);
      const modelResponse = await runModel({
        model: input.modelName,
        temperature: input.temperature,
        prompt
      });

      const evalResult = evaluateOutput({
        outputText: modelResponse.outputText,
        expectations: (test.expectations ?? {}) as Record<string, unknown>
      });

      if (evalResult.status === "pass") {
        passCount += 1;
      }
      latencies.push(modelResponse.latencyMs);
      costs.push(modelResponse.estimatedCost);
      correctnessScores.push(evalResult.correctness);

      const rawOutput = {
        output_text: modelResponse.outputText,
        provider_payload: modelResponse.raw,
        judge_explanation: evalResult.judgeExplanation,
        checks: evalResult.checks
      };

      const { error: resultError } = await supabase.from("results").insert({
        run_id: run.id,
        run_config_id: runConfig.id,
        test_id: test.id,
        status: evalResult.status,
        scores: { correctness: evalResult.correctness },
        failure_reasons: evalResult.failureReasons,
        raw_input: test.input,
        raw_output: rawOutput,
        latency_ms: modelResponse.latencyMs,
        cost: modelResponse.estimatedCost
      });

      if (resultError) {
        throw new Error(resultError.message);
      }
    }

    const total = tests.length || 1;
    const passRate = passCount / total;
    const avgCorrectness = correctnessScores.reduce((acc, score) => acc + score, 0) / total;
    const avgLatency = Math.round(latencies.reduce((acc, latency) => acc + latency, 0) / total);
    const totalCost = Number(costs.reduce((acc, cost) => acc + cost, 0).toFixed(6));

    const { error: metricsError } = await supabase.from("run_metrics").upsert({
      run_id: run.id,
      run_config_id: runConfig.id,
      project_id: run.project_id,
      pass_rate: passRate,
      avg_correctness: avgCorrectness,
      avg_latency_ms: avgLatency,
      p90_latency_ms: Math.round(percentile(latencies, 90)),
      total_cost: totalCost
    });

    if (metricsError) {
      throw new Error(metricsError.message);
    }

    await supabase
      .from("runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString()
      })
      .eq("id", run.id);

    return {
      id: run.id,
      status: "completed" as const
    };
  } catch (error) {
    await supabase
      .from("runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString()
      })
      .eq("id", run.id);
    throw error;
  }
}
