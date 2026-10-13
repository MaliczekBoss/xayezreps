"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseSource } from "@/lib/agents";
import { isAdmin } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE_S, adminConfigured, checkPassword, createSessionToken } from "@/lib/auth-token";
import { batches, categories, defaultWeight, type Batch, type Category, type Find } from "@/lib/finds";
import { discordConfigured, postFindToDiscord } from "@/lib/discord";
import { markDeleted, removeImage, storeImage } from "@/lib/docstore";
import { getQcIndex, withQc } from "@/lib/qc-feed";
import { MAX_OUTFIT_PARTS, type Outfit, type OutfitPart } from "@/lib/outfits";
import { FINDS_TAG, OUTFITS_TAG, getFindsFresh, getOutfitsFresh, saveFinds, saveOutfits } from "@/lib/store";

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

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  return s === "" ? null : Number(s);
};

/** Zdjęcie z formularza: zmniejszone do WEBP i zapisane w magazynie */
async function storeUpload(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Zdjęcie musi być w formacie JPG, PNG, WEBP, AVIF albo GIF.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Zdjęcie może mieć najwyżej 8 MB.");
  try {
    return await storeImage(await file.arrayBuffer());
  } catch {
    throw new Error("Nie udało się zapisać zdjęcia. Spróbuj z innym plikiem.");
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
  if (imageUrl && !/^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith("/uploads/") && !imageUrl.startsWith("/i/")) {
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
    return { error: "Nie udało się zapisać produktów. Spróbuj ponownie." };
  }
  if (existing && existing.image !== find.image) await removeImage(existing.image);

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
    await markDeleted("finds", id);
  } catch {
    return { error: "Nie udało się zapisać produktów. Spróbuj ponownie." };
  }
  await removeImage(target.image);
  updateTag(FINDS_TAG);
  return { ok: `Usunięto: ${target.name}` };
}

/** Wysyła produkt na kanał Discorda (webhook z DISCORD_WEBHOOK_URL) */
export async function sendFindToDiscord(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { error: "Sesja wygasła. Zaloguj się ponownie." };
  if (!discordConfigured()) {
    return { error: "Brak webhooka. Na Discordzie: Ustawienia kanału → Integracje → Webhooki → Nowy webhook → Kopiuj URL. Na Vercelu dodaj go jako DISCORD_WEBHOOK_URL i zrób Redeploy." };
  }
  const id = String(formData.get("id") ?? "");
  const [list, qcIndex] = await Promise.all([getFindsFresh(), getQcIndex()]);
  const target = list.find((f) => f.id === id);
  if (!target) return { error: "Tego itemu już nie ma." };
  try {
    await postFindToDiscord(withQc([target], qcIndex)[0]);
  } catch (e) {
    return { error: `Discord nie przyjął wiadomości (${(e as Error).message}). Sprawdź adres webhooka.` };
  }
  return { ok: `Wysłano na Discorda: ${target.name}` };
}

/* ---------- Outfity ---------- */

export async function saveOutfit(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { error: "Sesja wygasła. Zaloguj się ponownie." };

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const imageFile = formData.get("imageFile");
  let rawParts: unknown;
  try {
    rawParts = JSON.parse(String(formData.get("parts") ?? "[]"));
  } catch {
    return { error: "Nie udało się odczytać części outfitu." };
  }

  if (!title || title.length > 100) return { error: "Podaj tytuł (do 100 znaków)." };
  if (author.length > 60) return { error: "Autor może mieć najwyżej 60 znaków." };
  if (imageUrl && !/^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith("/uploads/")) return { error: "Link do zdjęcia musi zaczynać się od https://." };

  const finds = await getFindsFresh();
  const ids = new Set(finds.map((f) => f.id));
  const clamp = (n: unknown) => Math.min(100, Math.max(0, Math.round(Number(n) * 10) / 10 || 0));
  const parts: OutfitPart[] = (Array.isArray(rawParts) ? rawParts : [])
    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object" && ids.has(String((p as Record<string, unknown>).findId)))
    .slice(0, MAX_OUTFIT_PARTS)
    .map((p) => ({
      findId: String(p.findId),
      ...(typeof p.x === "number" && typeof p.y === "number" ? { x: clamp(p.x), y: clamp(p.y) } : {}),
      ...(typeof p.label === "string" && p.label.trim() ? { label: p.label.trim().slice(0, 60) } : {}),
    }));
  if (parts.length === 0) return { error: "Dodaj co najmniej jedną część i wybierz do niej find z katalogu." };

  const list = await getOutfitsFresh();
  const existing = id ? list.find((o) => o.id === id) : undefined;
  if (id && !existing) return { error: "Tego outfitu już nie ma. Odśwież stronę." };

  let image = imageUrl;
  try {
    if (imageFile instanceof File && imageFile.size > 0) image = await storeUpload(imageFile);
  } catch (error) {
    return { error: (error as Error).message };
  }

  const outfit: Outfit = {
    id: existing?.id ?? `o${randomUUID().slice(0, 8)}`,
    title,
    author: author || "xayezreps",
    image,
    parts,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  const next = existing ? list.map((o) => (o.id === outfit.id ? outfit : o)) : [outfit, ...list];
  try {
    await saveOutfits(next);
  } catch {
    return { error: "Nie udało się zapisać outfitów. Spróbuj ponownie." };
  }
  if (existing?.image && existing.image !== outfit.image) await removeImage(existing.image);

  updateTag(OUTFITS_TAG);
  return { ok: existing ? `Zapisano zmiany: ${outfit.title}` : `Dodano outfit: ${outfit.title}`, savedId: outfit.id };
}

export async function deleteOutfit(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await isAdmin())) return { error: "Sesja wygasła. Zaloguj się ponownie." };
  const id = String(formData.get("id") ?? "");
  const list = await getOutfitsFresh();
  const target = list.find((o) => o.id === id);
  if (!target) return { error: "Tego outfitu już nie ma." };
  try {
    await saveOutfits(list.filter((o) => o.id !== id));
    await markDeleted("outfits", id);
  } catch {
    return { error: "Nie udało się zapisać outfitów. Spróbuj ponownie." };
  }
  if (target.image) await removeImage(target.image);
  updateTag(OUTFITS_TAG);
  return { ok: `Usunięto outfit: ${target.title}` };
}
