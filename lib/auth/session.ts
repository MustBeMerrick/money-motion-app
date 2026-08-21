import "server-only";
import { cookies } from "next/headers";
import { createSessionToken, isValidSessionToken, SESSION_COOKIE_NAME } from "./session-token";

/**
 * `secure` is passed in rather than hardcoded: the app is reachable both over
 * HTTPS (through the Cloudflare tunnel) and plain HTTP on the LAN, and a
 * Secure cookie is silently dropped by the browser on the latter.
 */
export async function createSession(secure: boolean): Promise<void> {
  const { token, expiresAt } = createSessionToken();
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

export async function hasValidSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}
