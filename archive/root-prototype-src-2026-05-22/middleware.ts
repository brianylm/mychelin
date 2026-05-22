import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Old flat routes to redirect to /app/*
const REDIRECTS: Record<string, string> = {
  "/recipes": "/app/recipes",
  "/fridge": "/app/fridge",
  "/planner": "/app/planner",
  "/profile": "/app/profile",
  "/capture": "/app/capture",
  "/discover": "/app/discover",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Debug: add header to prove middleware is running
  const response = NextResponse.next();
  response.headers.set("x-middleware-debug", "running");

  // Redirect old flat routes
  if (REDIRECTS[pathname]) {
    return NextResponse.redirect(new URL(REDIRECTS[pathname], request.url));
  }

  // Redirect /recipes/[id] and /recipes/new
  if (pathname.startsWith("/recipes/")) {
    return NextResponse.redirect(new URL(pathname.replace("/recipes/", "/app/recipes/"), request.url));
  }

  // Protect /app/* routes — check for auth cookie
  if (pathname.startsWith("/app")) {
    const authCookie = request.cookies.get("auth-token");
    if (!authCookie?.value) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$|.*\\.svg$).*)"
};
