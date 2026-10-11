import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./auth-token";

/** Czy bieżące żądanie pochodzi od zalogowanego admina. Sprawdzaj w każdej akcji i stronie admina. */
export async function isAdmin() {
  // Sprawdzenie zależy od aktualnej godziny, więc zawsze liczymy je w czasie żądania
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, Date.now());
}
