import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "quakemonitor-secret-change-me-in-production"
);

const PROTECTED_PATHS = ["/admin"];
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only protect /admin routes
  if (!PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get("qm-auth")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Only admin users can access /admin
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch {
    // Invalid or expired token
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
