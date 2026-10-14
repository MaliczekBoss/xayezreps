import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import { verifySession } from "./admin-session";
import { SESSION_COOKIE } from "./auth-token";

/** Czy bieżące żądanie pochodzi od zalogowanego admina. Sprawdzaj w każdej stronie, akcji i API admina. */
export async function isAdmin() {
  // Sesję sprawdzamy zawsze w czasie żądania (ważność i unieważnienie w bazie)
  await connection();
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
