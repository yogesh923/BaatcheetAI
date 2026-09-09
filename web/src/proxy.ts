import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "baatcheet_session";

async function loggedInUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

// `/` is a public landing page. `/app/*` requires a valid Express session
// (→ /login). Signed-in visitors are bounced from /login into /app.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const loggedIn = (await loggedInUserId(req)) !== null;
  const isLogin = pathname === "/login";
  const isApp = pathname === "/app" || pathname.startsWith("/app/");

  if (!loggedIn && isApp) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (loggedIn && isLogin) {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
