import { APICallError, JSONParseError, NoObjectGeneratedError, NoOutputGeneratedError, RetryError, TypeValidationError } from "ai";
import { errorCode, provider, type ErrorBody, type ProviderId } from "./providers";

// SPEC §8.3 Errors. Providers retire models and keys expire often, so every failure becomes one of these,
// with a plain title, one sentence on what to do, the provider's status and code as detail, and a next step.

export type LlmErrorKind = "key" | "model" | "quota" | "rate" | "busy" | "network" | "output" | "setup" | "other";
export type LlmAction = { label: string; href: string; external?: boolean };

export class LlmError extends Error {
  constructor(
    readonly kind: LlmErrorKind,
    readonly title: string,
    message: string,
    readonly detail = "",
    readonly action?: LlmAction
  ) {
    super(message);
    this.name = "LlmError";
  }
}

const SETTINGS: LlmAction = { label: "Open Settings", href: "/settings" };

export const noModelError = () => new LlmError("setup", "No model connected", "Add an API key in Settings to start generating.", "", SETTINGS);

export const outputError = (detail = "") =>
  new LlmError("output", "The model's answer couldn't be used", "Nothing was changed. Try again, or switch to another model if it keeps happening.", detail);

const isOutputError = (e: unknown) => NoObjectGeneratedError.isInstance(e) || NoOutputGeneratedError.isInstance(e) || TypeValidationError.isInstance(e) || JSONParseError.isInstance(e);

/** Turns anything a provider call throws into an LlmError. Never copies the provider's message, which can echo the key. */
export function toLlmError(e: unknown, { provider: id, model }: { provider: ProviderId; model: string }): LlmError {
  if (e instanceof LlmError) return e;
  if (RetryError.isInstance(e)) e = e.lastError; // the SDK already retried a busy or rate-limited provider
  const { name, keyUrl } = provider(id);
  if (isOutputError(e)) return outputError();
  if (e instanceof TypeError || (APICallError.isInstance(e) && !e.statusCode)) {
    return new LlmError("network", `Couldn't reach ${name}`, "Check your internet connection and try again.");
  }
  if (!APICallError.isInstance(e)) return new LlmError("other", `Something went wrong with ${name}`, "Try again in a moment.");

  const status = e.statusCode!;
  let body: ErrorBody = {};
  try {
    body = JSON.parse(e.responseBody ?? "{}");
  } catch {
    // not JSON: classify by status alone
  }
  const code = errorCode(body);
  const text = body.error?.message ?? "";
  const detail = [status, code].filter(Boolean).join(" ");

  if (status === 401 || status === 403 || code === "API_KEY_INVALID") {
    return new LlmError("key", `${name} didn't accept your API key`, "The key may have been revoked, expired or deleted. Add a new key in Settings to keep going.", detail, SETTINGS);
  }
  if (status === 404 || code === "model_not_found" || (status === 400 && /model/i.test(text) && /deprecat|retired|not found|does not exist|not supported/i.test(text))) {
    return new LlmError(
      "model",
      `${model} isn't available any more`,
      `${name} may have retired or renamed this model, or your key can't use it. Choose another model and try again.`,
      detail,
      { label: "Choose a model", href: "/settings" }
    );
  }
  if (code === "insufficient_quota" || /credit balance/i.test(text)) {
    return new LlmError("quota", `Your ${name} account is out of credit`, `Check your plan and billing with ${name}, or switch to another provider.`, detail, {
      label: `Open ${name} console`,
      href: keyUrl,
      external: true,
    });
  }
  if (status === 429) {
    return new LlmError("rate", `${name} is getting too many requests`, `Wait a minute, then try again. If this keeps happening, check your usage limits with ${name}.`, detail);
  }
  if (status >= 500) {
    return new LlmError("busy", `${name} is having trouble right now`, `This is on ${name}'s side. Try again in a few minutes, or switch to another model.`, detail);
  }
  return new LlmError("other", `Something went wrong with ${name}`, "Try again in a moment.", detail);
}
