import { env } from "@/lib/env";

type ProviderInput = {
  model: string;
  temperature: number;
  prompt: string;
};

export type ProviderOutput = {
  outputText: string;
  raw: Record<string, unknown>;
  latencyMs: number;
  estimatedCost: number;
};

function mockOutput(input: ProviderInput, started: number): ProviderOutput {
  const outputText = `Mock response for prompt: ${input.prompt}`;
  const latencyMs = Date.now() - started + 40;
  return {
    outputText,
    raw: { mode: "mock", outputText },
    latencyMs,
    estimatedCost: Number(((input.prompt.length + outputText.length) / 100000).toFixed(6))
  };
}

async function callOpenAI(input: ProviderInput): Promise<ProviderOutput> {
  const started = Date.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.LLM_PROVIDER_API_KEY}`
    },
    body: JSON.stringify({
      model: input.model,
      temperature: input.temperature,
      input: input.prompt
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI provider failed (${response.status}): ${body}`);
  }

  const body = (await response.json()) as {
    output_text?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  const outputText = body.output_text ?? "";
  const usage = body.usage ?? {};
  const latencyMs = Date.now() - started;
  const tokenCount = (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
  const estimatedCost = Number((tokenCount * 0.000002).toFixed(6));

  return {
    outputText,
    raw: body as unknown as Record<string, unknown>,
    latencyMs,
    estimatedCost
  };
}

async function callGroq(input: ProviderInput): Promise<ProviderOutput> {
  const started = Date.now();
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.LLM_PROVIDER_API_KEY}`
    },
    body: JSON.stringify({
      model: input.model,
      temperature: input.temperature,
      messages: [{ role: "user", content: input.prompt }]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq provider failed (${response.status}): ${body}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const outputText = body.choices?.[0]?.message?.content ?? "";
  const usage = body.usage ?? {};
  const latencyMs = Date.now() - started;
  const tokenCount = (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);
  const estimatedCost = Number((tokenCount * 0.000002).toFixed(6));

  return {
    outputText,
    raw: body as unknown as Record<string, unknown>,
    latencyMs,
    estimatedCost
  };
}

export async function runModel(input: ProviderInput): Promise<ProviderOutput> {
  const started = Date.now();
  if (!env.LLM_PROVIDER_API_KEY) {
    return mockOutput(input, started);
  }

  if (env.LLM_PROVIDER_BACKEND === "groq") {
    return callGroq(input);
  }

  return callOpenAI(input);
}
