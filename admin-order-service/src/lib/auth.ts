import { createLocalJWKSet, jwtVerify, type JWTPayload } from "jose";

const ISS = process.env.JWT_ISSUER!;
const AUD = process.env.JWT_AUDIENCE!;
const SECRET = process.env.JWT_SECRET;
const JWKS_URL = process.env.JWT_JWKS_URL;

let jwkSet: ReturnType<typeof createLocalJWKSet> | undefined;

async function getKey(header: unknown, token: unknown) {
  if (JWKS_URL) {
    if (!jwkSet) {
      const res = await fetch(JWKS_URL);
      if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
      const jwks = await res.json();
      jwkSet = createLocalJWKSet(jwks);
    }
    // @ts-expect-error jose types quirk
    return jwkSet(header, token);
  }
  if (!SECRET) throw new Error("JWT keying not configured");
  return new TextEncoder().encode(SECRET);
}

export type JwtPayload = JWTPayload & {
  sub: string;
  roles?: string[];
  scope?: string;
};

export async function verifyBearer(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getKey as any, {
    issuer: ISS,
    audience: AUD,
  });
  return payload as JwtPayload;
}
