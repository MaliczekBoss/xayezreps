"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseSource } from "@/lib/agents";
import { isAdmin } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE_S, adminConfigured, checkPassword, createSessionToken } from "@/lib/auth-token";
import { batches, categories, defaultWeight, type Batch, type Category, type Find } from "@/lib/finds";
import { FINDS_TAG, UPLOADS_DIR, getFindsFresh, saveFinds } from "@/lib/store";

export type FormState = { error?: string; ok?: string; savedId?: string };

/* ---------- Logowanie ---------- */

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!adminConfigured()) {
    return { error: "Panel nie jest skonfigurowany. Na Vercelu dodaj ADMIN_PASSWORD i ADMIN_SECRET w Settings → Environment Variables i zrób Redeploy (lokalnie: plik .env.local i restart serwera)." };
  }
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    // Spowolnienie zgadywania hasła
    await new Promise((r) => setTimeout(r, 600));
    return { error: "Nieprawidłowe hasło." };
  }
  (await cookies()).set(SESSION_COOKIE, createSessionToken(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/* ---------- Produkty ---------- */

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  return s === "" ? null : Number(s);
};

async function storeUpload(file: File) {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error("Zdjęcie musi być w formacie JPG, PNG, WEBP, AVIF albo GIF.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Zdjęcie może mieć najwyżej 4 MB.");
  await mkdir(UPLOADS_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(process.cwd(), "data", "uploads", name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

async function removeUpload(image: string) {
  if (!image.startsWith("/uploads/")) return;
  try {
    await unlink(path.join(process.cwd(), "data", "uploads", path.basename(image)));
  } catch {
    // Plik mógł już zniknąć – nic nie szkodzi
  }
}

export async function saveFind(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { error: "Sesja wygasła. Zaloguj się ponownie." };

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as Category;
  const batch = String(formData.get("batch") ?? "") as Batch;
  const link = String(formData.get("link") ?? "").trim();
  const price = num(formData.get("price"));
  const weight = num(formData.get("weight"));
  const views = num(formData.get("views"));
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const imageFile = formData.get("imageFile");

  if (!name || name.length > 140) return { error: "Podaj nazwę (do 140 znaków)." };
  if (!categories.includes(category)) return { error: "Wybierz kategorię." };
  if (!batches.includes(batch)) return { error: "Wybierz batch." };
  const source = parseSource(link);
  if (!source) return { error: "Nie rozpoznaję linku. Wklej link z Weidiana, Taobao, 1688 albo od agenta." };
  if (price === null || !Number.isFinite(price) || price < 0 || price > 100000) return { error: "Podaj cenę w złotówkach." };
  if (weight !== null && (!Number.isInteger(weight) || weight < 1 || weight > 30000)) {
    return { error: "Waga musi być liczbą gramów od 1 do 30 000." };
  }
  if (views !== null && (!Number.isInteger(views) || views < 0)) return { error: "Wyświetlenia muszą być liczbą całkowitą." };
  if (imageUrl && !/^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith("/uploads/")) {
    return { error: "Link do zdjęcia musi zaczynać się od https://." };
  }

  const list = await getFindsFresh();
  const existing = id ? list.find((f) => f.id === id) : undefined;
  if (id && !existing) return { error: "Tego itemu już nie ma. Odśwież stronę." };

  let image = imageUrl || existing?.image || "";
  try {
    if (imageFile instanceof File && imageFile.size > 0) image = await storeUpload(imageFile);
  } catch (error) {
    return { error: (error as Error).message };
  }
  if (!image) return { error: "Dodaj zdjęcie: wgraj plik albo wklej link." };

  const find: Find = {
    id: existing?.id ?? `a${randomUUID().slice(0, 8)}`,
    name,
    category,
    batch,
    pricePln: Math.round(price * 100) / 100,
    weightGrams: weight ?? defaultWeight[category],
    views: views ?? existing?.views ?? 0,
    image,
    source,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  const next = existing ? list.map((f) => (f.id === find.id ? find : f)) : [find, ...list];
  try {
    await saveFinds(next);
  } catch {
    return { error: "Nie udało się zapisać pliku z produktami." };
  }
  if (existing && existing.image !== find.image) await removeUpload(existing.image);

  updateTag(FINDS_TAG);
  return { ok: existing ? `Zapisano zmiany: ${find.name}` : `Dodano: ${find.name}`, savedId: find.id };
}

export async function deleteFind(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { error: "Sesja wygasła. Zaloguj się ponownie." };
  const id = String(formData.get("id") ?? "");
  const list = await getFindsFresh();
  const target = list.find((f) => f.id === id);
  if (!target) return { error: "Tego itemu już nie ma." };
  try {
    await saveFinds(list.filter((f) => f.id !== id));
  } catch {
    return { error: "Nie udało się zapisać pliku z produktami." };
  }
  await removeUpload(target.image);
  updateTag(FINDS_TAG);
  return { ok: `Usunięto: ${target.name}` };
}
