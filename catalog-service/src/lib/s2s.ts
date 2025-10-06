import { NextRequest } from "next/server";
import { makeHttpError } from "@/lib/http";
import crypto from "node:crypto";

function timingSafeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function requireS2SKey(req: NextRequest) {
  const expected = process.env.PUBLIC_S2S_KEY;
  if (!expected) return; // allow if not configured in dev

  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const provided = (match?.[1] ?? auth).trim();

  if (!provided || !timingSafeEq(provided, expected)) {
    throw makeHttpError(401, "Unauthorized");
  }
}
