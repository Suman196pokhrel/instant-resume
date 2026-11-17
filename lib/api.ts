import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Shared route handler plumbing (SPEC §7.2): invalid bodies are 422 with readable field paths.
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string
  ) {
    super(code);
  }
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ZodError) {
        const issues = e.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
        return NextResponse.json({ error: "invalid", issues }, { status: 422 });
      }
      if (e instanceof ApiError) return NextResponse.json({ error: e.code }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: "server_error" }, { status: 500 }); // never echoes the input
    }
  };
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => {
    throw new ApiError(422, "invalid_json");
  });
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(422, "invalid_json");
  return body as Record<string, unknown>;
}

export const noContent = () => new NextResponse(null, { status: 204 });
