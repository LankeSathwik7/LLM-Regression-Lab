"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginCard() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGithub = async () => {
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${origin}/auth/callback` }
    });
    if (error) setMessage(error.message);
    setLoading(false);
  };

  const handleEmail = async () => {
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` }
    });
    setMessage(error ? error.message : "Magic link sent. Check your inbox.");
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">LLM Reliability Lab ??</CardTitle>
        <CardDescription>Sign in to manage eval suites and regression runs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button className="w-full" variant="default" onClick={handleGithub} disabled={loading}>
          Continue with GitHub
        </Button>
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button className="w-full" variant="accent" onClick={handleEmail} disabled={loading || !email}>
            Continue with Email
          </Button>
        </div>
        <p className="text-xs text-slate-500">Powered by Supabase Auth</p>
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

