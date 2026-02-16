import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  LLM_PROVIDER_API_KEY: z.string().min(1).optional(),
  LLM_PROVIDER_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  LLM_PROVIDER_BACKEND: z.enum(["openai", "groq"]).default("openai"),
  JUDGE_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  INTERNAL_API_KEY: z.string().min(1).optional()
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  LLM_PROVIDER_API_KEY: process.env.LLM_PROVIDER_API_KEY || undefined,
  LLM_PROVIDER_MODEL: process.env.LLM_PROVIDER_MODEL,
  LLM_PROVIDER_BACKEND: process.env.LLM_PROVIDER_BACKEND,
  JUDGE_MODEL: process.env.JUDGE_MODEL,
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || undefined
});

if (!parsed.success) {
  // Throws only when env is accessed in runtime; keeps local DX clear.
  console.warn("Environment variables are incomplete:", parsed.error.flatten().fieldErrors);
}

export const env = parsed.success
  ? parsed.data
  : {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
      LLM_PROVIDER_API_KEY: process.env.LLM_PROVIDER_API_KEY || undefined,
      LLM_PROVIDER_MODEL: process.env.LLM_PROVIDER_MODEL ?? "gpt-4.1-mini",
      LLM_PROVIDER_BACKEND: (process.env.LLM_PROVIDER_BACKEND as "openai" | "groq" | undefined) ?? "openai",
      JUDGE_MODEL: process.env.JUDGE_MODEL ?? "gpt-4.1-mini",
      INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || undefined
    };

