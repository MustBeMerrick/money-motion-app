import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { isLockedOut, recordFailedAttempt, clearAttempts } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  const ip =
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";

  if (isLockedOut(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const storedHash = process.env.AUTH_PASSWORD_HASH;
  if (!storedHash) {
    return NextResponse.json({ error: "Password login is not configured" }, { status: 500 });
  }

  const { password } = (await request.json()) as { password?: string };
  if (!password || !verifyPassword(password, storedHash)) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  clearAttempts(ip);
  // behind the tunnel this arrives as https; on the LAN it doesn't, and a
  // Secure cookie would be dropped there
  const https =
    request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
  await createSession(https);
  return NextResponse.json({ verified: true });
}
