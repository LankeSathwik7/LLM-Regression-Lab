type ConstraintCheck = {
  rule: string;
  status: "pass" | "fail";
  message: string;
};

type EvalInput = {
  outputText: string;
  expectations: Record<string, unknown>;
};

export type EvalResult = {
  status: "pass" | "fail";
  correctness: number;
  checks: ConstraintCheck[];
  failureReasons: string[];
  judgeExplanation: string;
};

function checkRequiredKeywords(outputText: string, requiredKeywords: string[]): ConstraintCheck {
  const missing = requiredKeywords.filter((keyword) => !outputText.toLowerCase().includes(keyword.toLowerCase()));
  if (missing.length > 0) {
    return {
      rule: "required_keywords",
      status: "fail",
      message: `Missing keywords: ${missing.join(", ")}`
    };
  }
  return {
    rule: "required_keywords",
    status: "pass",
    message: "All required keywords present."
  };
}

function checkOutputNotEmpty(outputText: string): ConstraintCheck {
  if (!outputText.trim()) {
    return {
      rule: "non_empty_output",
      status: "fail",
      message: "Output is empty."
    };
  }
  return {
    rule: "non_empty_output",
    status: "pass",
    message: "Output is non-empty."
  };
}

function checkJSONShape(outputText: string, expectation: unknown): ConstraintCheck {
  if (!expectation || typeof expectation !== "object") {
    return {
      rule: "json_shape",
      status: "pass",
      message: "No JSON shape expectation set."
    };
  }

  try {
    const parsed = JSON.parse(outputText);
    const requiredKeys = Array.isArray((expectation as { required_keys?: unknown }).required_keys)
      ? ((expectation as { required_keys: string[] }).required_keys as string[])
      : [];
    const missing = requiredKeys.filter((key) => !(key in parsed));
    if (missing.length > 0) {
      return {
        rule: "json_shape",
        status: "fail",
        message: `Missing JSON keys: ${missing.join(", ")}`
      };
    }
    return {
      rule: "json_shape",
      status: "pass",
      message: "JSON shape matched."
    };
  } catch {
    return {
      rule: "json_shape",
      status: "fail",
      message: "Output is not valid JSON."
    };
  }
}

export function evaluateOutput(input: EvalInput): EvalResult {
  const checks: ConstraintCheck[] = [];
  checks.push(checkOutputNotEmpty(input.outputText));

  const requiredKeywords = Array.isArray(input.expectations.required_keywords)
    ? (input.expectations.required_keywords as string[])
    : [];
  if (requiredKeywords.length > 0) {
    checks.push(checkRequiredKeywords(input.outputText, requiredKeywords));
  }

  if (input.expectations.json_shape) {
    checks.push(checkJSONShape(input.outputText, input.expectations.json_shape));
  }

  const passed = checks.filter((check) => check.status === "pass").length;
  const correctness = checks.length === 0 ? 1 : passed / checks.length;
  const failureReasons = checks.filter((check) => check.status === "fail").map((check) => check.rule);
  const status: "pass" | "fail" = failureReasons.length === 0 ? "pass" : "fail";

  return {
    status,
    correctness,
    checks,
    failureReasons,
    judgeExplanation:
      status === "pass"
        ? "Output satisfied all configured deterministic checks."
        : `Output failed ${failureReasons.length} check(s): ${failureReasons.join(", ")}.`
  };
}
