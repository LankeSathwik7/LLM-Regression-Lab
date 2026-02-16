#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      args[token.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return value;
}

async function apiRequest(endpoint, { method = "GET", body } = {}) {
  const apiBase = assertEnv("LLM_LAB_API_URL");
  const apiKey = assertEnv("LLM_LAB_INTERNAL_API_KEY");
  const userId = assertEnv("LLM_LAB_USER_ID");
  const response = await fetch(`${apiBase}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-internal-api-key": apiKey,
      "x-user-id": userId
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return response.json();
}

async function runSuite(args) {
  const suiteId = args.suite;
  if (!suiteId) {
    throw new Error("run requires --suite <suite_id>");
  }
  const body = {
    model_name: args.model ?? "gpt-4.1-mini",
    temperature: Number(args.temperature ?? "0.2"),
    baseline_run_id: args.baseline ?? null,
    git_branch: args.branch ?? null,
    git_commit: args.commit ?? null
  };
  const response = await apiRequest(`/api/suites/${suiteId}/runs`, { method: "POST", body });
  console.log(JSON.stringify(response, null, 2));
}

async function syncSuite(args) {
  const suiteId = args.suite;
  const file = args.file;
  if (!suiteId || !file) {
    throw new Error("sync requires --suite <suite_id> --file <suite-json-path>");
  }
  const absolutePath = path.resolve(process.cwd(), file);
  const suite = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  if (!Array.isArray(suite.tests)) {
    throw new Error("Suite JSON must contain tests[]");
  }

  for (const test of suite.tests) {
    const payload = {
      key: test.key,
      description: test.description ?? null,
      input: test.input ?? {},
      expectations: test.expectations ?? {},
      tags: test.tags ?? []
    };
    const response = await apiRequest(`/api/suites/${suiteId}/tests`, { method: "POST", body: payload });
    console.log(`synced test ${payload.key}: ${response.test.id}`);
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);

  if (command === "run") {
    await runSuite(args);
    return;
  }

  if (command === "sync") {
    await syncSuite(args);
    return;
  }

  console.log("Usage:");
  console.log("  node cli/llm-lab.mjs run --suite <suite_id> [--model gpt-4.1-mini] [--temperature 0.2]");
  console.log("  node cli/llm-lab.mjs sync --suite <suite_id> --file examples/suites/support-basic.json");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
