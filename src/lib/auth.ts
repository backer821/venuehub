import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function resolveSecret(): string {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET environment variable is required in production."
    );
  }

  console.warn(
    "[auth] JWT_SECRET is not set; using an insecure development-only default. " +
      "Set JWT_SECRET in your .env.local before deploying."
  );
  return "dev-only-insecure-secret-do-not-use-in-production";
}

const SECRET = new TextEncoder().encode(resolveSecret());

export interface JWTPayload {
  userId: number;
  venueId: number;
  role: string;
  name: string;
  email?: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("vh_session")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function canAccess(role: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(role);
}
