import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { sortPopular } from "@/lib/finds";
import { getFindsFresh, getOutfitsFresh } from "@/lib/store";
import { OutfitsEditor } from "./outfits-editor";

export const metadata: Metadata = { title: "Outfity" };

export default function AdminOutfitsPage() {
  return (
    <Suspense fallback={<p className="p-10 text-center text-sm text-muted">Ładowanie outfitów…</p>}>
      <OutfitsContent />
    </Suspense>
  );
}

async function OutfitsContent() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [outfits, finds] = await Promise.all([getOutfitsFresh(), getFindsFresh()]);
  const catalog = sortPopular(finds).map(({ id, name, image, category }) => ({ id, name, image, category }));
  return <OutfitsEditor outfits={[...outfits].sort((a, b) => b.createdAt.localeCompare(a.createdAt))} finds={catalog} />;
}
