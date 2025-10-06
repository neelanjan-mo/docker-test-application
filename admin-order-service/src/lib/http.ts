import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { verifyBearer } from "@/lib/auth";
import { PAGE_DEFAULT, PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from "@/constants";

export function makeHttpError(
  status: number,
  message: string,
  details?: unknown
) {
  return Object.assign(new Error(message), { status, details });
}

export function handleApiError(e: unknown) {
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: "ValidationError", issues: e.issues },
      { status: 422 }
    );
  }
  if (e && typeof e === "object" && "status" in e) {
    const err = e as { status: number; message?: string; details?: unknown };
    return NextResponse.json(
      { error: err.message ?? "Error", details: err.details },
      { status: err.status }
    );
  }
  return NextResponse.json({ error: "InternalServerError" }, { status: 500 });
}

/** Stable pagination parser with sane bounds */
export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(
    1,
    Number(searchParams.get("page") ?? String(PAGE_DEFAULT))
  );
  const pageSize = Math.max(
    1,
    Math.min(
      PAGE_SIZE_MAX,
      Number(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT))
    )
  );
  return { page, pageSize };
}

/** Enforce Bearer JWT and optional role scope */
export async function requireAdminAuth(req: NextRequest, role?: string) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw makeHttpError(401, "Unauthorized");
  const claims = await verifyBearer(token);
  if (role) {
    const roles = (claims.roles ?? []) as string[];
    if (!roles.includes(role)) throw makeHttpError(403, "Forbidden");
  }
  return claims;
}
