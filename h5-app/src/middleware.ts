import { NextRequest, NextResponse } from "next/server";
import { h5AuthSessionCookieName } from "@/lib/auth";

const loginPath = "/login";
const protectedPathPrefixes = ["/history", "/profile", "/result"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (hasValidH5AuthCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = loginPath;
  loginUrl.search = "";
  loginUrl.searchParams.set("notice", "login_required");
  loginUrl.searchParams.set("redirect", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    protectedPathPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

function hasValidH5AuthCookie(request: NextRequest) {
  const snapshot = request.cookies.get(h5AuthSessionCookieName)?.value;
  if (!snapshot) return false;

  try {
    const session = JSON.parse(decodeURIComponent(snapshot)) as {
      expiresAt?: unknown;
      token?: unknown;
    };
    return (
      typeof session.token === "string" &&
      typeof session.expiresAt === "number" &&
      session.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}
