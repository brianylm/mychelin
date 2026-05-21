import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_APP_ROUTES = ["/app"];

// Old flat routes to redirect to /app/*
const REDIRECTS: Record<string, string> = {
  "/recipes": "/app/recipes",
  "/fridge": "/app/fridge",
  "/planner": "/app/planner",
  "/profile": "/app/profile",
  "/capture": "/app/capture",
  "/discover": "/app/discover",
};

// Also redirect /recipes/[id] and /recipes/new
function getRedirectPath(pathname: string): string | null {
  // Exact matches
  if (REDIRECTS[pathname]) {
    return REDIRECTS[pathname];
  }

  // /recipes/[id] → /app/recipes/[id]
  if (pathname.match(/^\/recipes\/[^/]+$/)) {
    return pathname.replace("/recipes/", "/app/recipes/");
  }

  // /recipes/new → /app/recipes/new
  if (pathname === "/recipes/new") {
    return "/app/recipes/new";
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect old flat routes
  const redirectPath = getRedirectPath(pathname);
  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Protect /app/* routes — check for auth cookie
  const isAppRoute = pathname.startsWith("/app");
  if (isAppRoute) {
    const authCookie = request.cookies.get("auth-token");
    if (!authCookie?.value) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.).*)"],
};
