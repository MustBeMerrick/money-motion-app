import { NextRequest, NextResponse } from "next/server";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session-token";

const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  // local `next dev` is unauthenticated; every deployed instance is gated
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!isValidSessionToken(token)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Static assets (images/fonts/icons, wherever they live under public/ or the
  // app dir's icon conventions) are never sensitive -- gate everything else.
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?)$).*)",
  ],
};
