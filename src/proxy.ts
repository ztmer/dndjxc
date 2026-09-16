import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionUserId, SESSION_COOKIE } from "@/lib/auth-crypto";
import { isPublicPath } from "@/lib/auth-shared";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const userId = readSessionUserId(request.cookies.get(SESSION_COOKIE)?.value);
  if (userId) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  const search = request.nextUrl.search || "";
  const next = `${pathname}${search}`;
  if (next && next !== "/") {
    url.searchParams.set("next", next);
  } else {
    url.search = "";
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\..*).*)"],
};
