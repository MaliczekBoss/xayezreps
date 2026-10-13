import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-token";

const DISCORD = /Discordbot/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Discord dostaje podgląd linku z białym paskiem i grafiką produktu (src/app/api/embed)
  if (!pathname.startsWith("/admin")) {
    if (DISCORD.test(request.headers.get("user-agent") ?? "")) {
      return NextResponse.rewrite(new URL(`/api/embed?path=${encodeURIComponent(pathname)}`, request.url));
    }
    return NextResponse.next();
  }

  // Bramka panelu admina: bez ważnej sesji przekierowuje na logowanie
  if (pathname === "/admin/login") return NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifySessionToken(token, Date.now())) return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/", "/product/:path*", "/outfits/:path*", "/admin", "/admin/:path*"],
};
