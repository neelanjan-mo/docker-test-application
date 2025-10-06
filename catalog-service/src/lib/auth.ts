import { jwtVerify, type JWTPayload } from "jose";

const ISS = process.env.JWT_ISSUER!;
const AUD = process.env.JWT_AUDIENCE!;
const SECRET = process.env.JWT_SECRET!;
const SECRET_KEY = new TextEncoder().encode(SECRET); // allocate once

export type JwtPayload = JWTPayload & { sub?: string; roles?: string[] };

export async function verifyBearer(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, SECRET_KEY, {
    algorithms: ["HS256"],
    issuer: ISS,
    audience: AUD,
  });
  return payload as JwtPayload;
}
