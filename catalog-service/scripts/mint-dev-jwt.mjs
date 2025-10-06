import { SignJWT } from "jose";
if (!process.env.JWT_SECRET) { console.error("JWT_SECRET missing"); process.exit(1); }
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const roles = ["products:read","products:write"];
const jwt = await new SignJWT({ roles })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setIssuer(process.env.JWT_ISSUER)
  .setAudience(process.env.JWT_AUDIENCE)
  .setExpirationTime("30m")
  .sign(secret);
console.log(jwt);
