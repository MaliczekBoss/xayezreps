import "server-only";

import { cookies } from "next/headers";
import { connection } from "next/server";
import { verifySession } from "./admin-session";
import { SESSION_COOKIE } from "./auth-token";

export async function isAdmin() {
  await connection();
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
