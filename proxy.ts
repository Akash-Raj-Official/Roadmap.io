import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname === "/admin/login" && role === "admin") {
    return NextResponse.redirect(new URL("/admin", req.nextUrl));
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }

  if (pathname.startsWith("/dashboard") && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
