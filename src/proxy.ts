import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/admin-session";
import { SESSION_COOKIE } from "@/lib/auth-token";

const DISCORD = /Discordbot/i;

/** Odpowiedzi panelu admina: bez zapisu w cache i bez indeksowania */
function adminHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Discord dostaje podgląd linku z białym paskiem i grafiką produktu (src/app/api/embed)
  if (!pathname.startsWith("/admin")) {
    if (DISCORD.test(request.headers.get("user-agent") ?? "")) {
      return NextResponse.rewrite(new URL(`/api/embed?path=${encodeURIComponent(pathname)}`, request.url));
    }
    return NextResponse.next();
  }

  // Bramka panelu admina: sesja musi mieć ważny podpis i istnieć w bazie (wylogowanie ją unieważnia).
  // Strony i API admina sprawdzają sesję jeszcze raz same.
  const signedIn = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (pathname === "/admin/login") {
    return adminHeaders(signedIn ? NextResponse.redirect(new URL("/admin/stats", request.url)) : NextResponse.next());
  }
  return adminHeaders(signedIn ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login", request.url)));
}

export const config = {
  matcher: ["/", "/product/:path*", "/outfits/:path*", "/admin", "/admin/:path*"],
};
