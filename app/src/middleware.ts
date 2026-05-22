import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // App subdomain: rewrite root to /app internally
  // Future-proof: when app.mychelin.sg is configured, this will work
  if (host.startsWith("app.")) {
    if (url.pathname === "/") {
      url.pathname = "/app";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // FUTURE: when custom subdomain is configured, uncomment to redirect
  // /app on main domain → app subdomain
  // if (url.pathname === "/app") {
  //   const appUrl = new URL("/", `${url.protocol}//app.${host}`);
  //   return NextResponse.redirect(appUrl);
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icons|images|manifest.json).*)",
  ],
};
