import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getHomeRouteForRole } from "@/lib/auth/routes";
import { verifySessionToken } from "@/lib/auth/token";

const AUTH_PAGES = new Set(["/login", "/signup"]);
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

function applyCorsHeaders(response: NextResponse) {
  Object.entries(CORS_HEADERS).forEach(([header, value]) => {
    response.headers.set(header, value);
  });

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    return applyCorsHeaders(NextResponse.next());
  }

  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

  const homeRoute = session ? getHomeRouteForRole(session.role) : "/login";

  if ((pathname === "/dashboard" || pathname.startsWith("/dashboard/")) && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session.role !== "user") {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
  }

  if (pathname === "/history" || pathname.startsWith("/history/")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname === "/responder" || pathname.startsWith("/responder/")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session.role !== "responder") {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session.role !== "admin" && session.role !== "superadmin") {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
  }

  if (pathname === "/superadmin" || pathname.startsWith("/superadmin/")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (session.role !== "superadmin") {
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
  }

  if (AUTH_PAGES.has(pathname) && session) {
    return NextResponse.redirect(new URL(homeRoute, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/history/:path*",
    "/responder/:path*",
    "/admin/:path*",
    "/superadmin/:path*",
    "/api/:path*",
  ],
};
