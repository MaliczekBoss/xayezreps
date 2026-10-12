"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Crosshair, ImagePlus, Pencil, Plus, Trash, X } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import type { Find } from "@/lib/finds";
import { hasPoint, MAX_OUTFIT_PARTS, type Outfit, type OutfitPart } from "@/lib/outfits";
import { deleteOutfit, saveOutfit, type FormState } from "../actions";
import { AdminHeader } from "../admin-header";

type CatalogItem = Pick<Find, "id" | "name" | "image" | "category">;

const field = "h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-sm text-fg placeholder:text-dim focus:border-line-strong focus:outline-none";
const label = "mb-1.5 block text-sm font-medium";
const optionLabel = (f: CatalogItem) => `${f.name} (#${f.id})`;

export function OutfitsEditor({ outfits, finds }: { outfits: Outfit[]; finds: CatalogItem[] }) {
  const [editing, setEditing] = useState<Outfit | null>(null);
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(finds.map((f) => [f.id, f])), [finds]);

  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await saveOutfit(prev, data);
    if (result.ok) {
      setEditing(null);
      setFormKey((k) => k + 1);
    }
    return result;
  }, {});

  const startEdit = (o: Outfit) => {
    setEditing(o);
    setFormKey((k) => k + 1);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <AdminHeader active="/admin/outfits" />

      <datalist id="outfit-finds">
        {finds.map((f) => (
          <option key={f.id} value={optionLabel(f)} />
        ))}
      </datalist>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        <div ref={formRef} className="scroll-mt-24">
          <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold tracking-[-0.02em]">{editing ? "Edytuj outfit" : "Nowy outfit"}</h1>
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setFormKey((k) => k + 1);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted hover:bg-bg hover:text-fg"
                >
                  <X aria-hidden size={15} />
                  Anuluj
                </button>
              )}
            </div>
            <OutfitForm key={formKey} editing={editing} byId={byId} finds={finds} action={action} pending={pending} />
            {state.error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">{state.error}</p>}
            {state.ok && <p className="mt-4 rounded-xl border border-gl/30 bg-gl/10 px-3.5 py-2.5 text-sm text-gl">{state.ok}</p>}
          </div>
        </div>

        <section aria-labelledby="outfits-list" className="rounded-2xl border border-line bg-card">
          <h2 id="outfits-list" className="border-b border-line px-5 py-4 font-semibold">
            Outfity <span className="font-normal text-muted">({outfits.length})</span>
          </h2>
          {outfits.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted">Nie ma jeszcze outfitów. Dodaj pierwszy w formularzu.</p>
          ) : (
            <ul className="divide-y divide-line">
              {outfits.map((o) => {
                const cover = o.image || byId.get(o.parts[0]?.findId ?? "")?.image || "";
                return (
                  <li key={o.id} className={`flex items-center gap-3.5 px-4 py-3 ${editing?.id === o.id ? "bg-white/[0.04]" : ""}`}>
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-bg">{cover && <ProductImage src={cover} sizes="3.5rem" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{o.title}</span>
                      <span className="block text-sm text-muted">
                        {o.author}, {o.parts.length} cz. {o.image ? "" : "(kolaż)"}
                      </span>
                    </span>
                    <a href={`/outfits/${o.id}`} target="_blank" rel="noopener noreferrer" className="hidden text-sm text-muted underline-offset-4 hover:text-fg hover:underline sm:inline">
                      Zobacz
                    </a>
                    <button
                      type="button"
                      onClick={() => startEdit(o)}
                      className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:border-line-strong hover:text-fg"
                      title="Edytuj"
                    >
                      <Pencil aria-hidden size={15} />
                      <span className="sr-only">Edytuj {o.title}</span>
                    </button>
                    <DeleteOutfit outfit={o} onDeleted={() => editing?.id === o.id && setEditing(null)} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

type FormProps = {
  editing: Outfit | null;
  byId: Map<string, CatalogItem>;
  finds: CatalogItem[];
  action: (data: FormData) => void;
  pending: boolean;
};

function OutfitForm({ editing, byId, finds, action, pending }: FormProps) {
  const [parts, setParts] = useState<OutfitPart[]>(editing?.parts ?? []);
  const [imageUrl, setImageUrl] = useState(editing?.image ?? "");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [placing, setPlacing] = useState<number | null>(null);
  const preview = filePreview ?? imageUrl;

  useEffect(() => () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  const update = (i: number, patch: Partial<OutfitPart>) => setParts((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const onPhotoClick = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    if (placing !== null) {
      update(placing, { x, y });
      setPlacing(null);
    } else if (parts.length < MAX_OUTFIT_PARTS) {
      setParts((list) => [...list, { findId: "", x, y }]);
    }
  };

  const pickFind = (i: number, value: string) => {
    const id = value.match(/\(#([\w-]+)\)$/)?.[1];
    if (id && byId.has(id)) update(i, { findId: id });
  };

  return (
    <form action={action} className="mt-5 space-y-4">
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <input type="hidden" name="parts" value={JSON.stringify(parts.filter((p) => p.findId))} />

      <div>
        <label htmlFor="o-title" className={label}>
          Tytuł
        </label>
        <input id="o-title" name="title" required maxLength={100} defaultValue={editing?.title} placeholder="np. Zimowy fit z Monclerem" className={field} />
      </div>
      <div>
        <label htmlFor="o-author" className={label}>
          Autor albo osoba na zdjęciu
        </label>
        <input id="o-author" name="author" maxLength={60} defaultValue={editing?.author} placeholder="xayezreps" className={field} />
      </div>

      <div>
        <span className={label}>Zdjęcie stylizacji (opcjonalnie)</span>
        <div className="flex gap-2">
          <label className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-line bg-bg px-3.5 text-sm text-muted hover:border-line-strong hover:text-fg">
            <ImagePlus aria-hidden size={16} />
            Wgraj
            <input
              type="file"
              name="imageFile"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFilePreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </label>
          <label htmlFor="o-image" className="sr-only">
            Albo link do zdjęcia
          </label>
          <input id="o-image" name="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="albo link: https://…" className={field} />
        </div>
        <p className="mt-1.5 text-xs text-dim">Bez zdjęcia outfit pokaże się jako kolaż ze zdjęć części.</p>
      </div>

      {preview ? (
        <div>
          <p className="mb-2 text-sm text-muted">
            {placing !== null ? `Kliknij na zdjęciu, gdzie ma stać punkt ${placing + 1}.` : "Kliknij na zdjęciu, żeby dodać część w tym miejscu."}
          </p>
          <div onClick={onPhotoClick} className={`relative mx-auto aspect-[4/5] max-w-sm overflow-hidden rounded-xl border bg-bg ${placing !== null ? "cursor-crosshair border-fg" : "cursor-copy border-line"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- podgląd zdjęcia przed zapisem */}
            <img src={preview} alt="Podgląd zdjęcia outfitu" className="size-full object-cover" />
            {parts.map((p, i) => hasPoint(p) && (
              <span
                key={i}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                className={`pointer-events-none absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-xs font-bold ${
                  placing === i ? "border-fg bg-fg text-bg" : "border-white bg-black/70 text-white"
                }`}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={parts.length >= MAX_OUTFIT_PARTS}
          onClick={() => setParts((list) => [...list, { findId: "" }])}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-bg px-3.5 text-sm font-medium hover:border-line-strong disabled:opacity-50"
        >
          <Plus aria-hidden size={15} />
          Dodaj część
        </button>
      )}

      {parts.length > 0 && (
        <ol className="space-y-2">
          {parts.map((p, i) => {
            const find = byId.get(p.findId);
            return (
              <li key={i} className="rounded-xl border border-line bg-bg p-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-bold">{i + 1}</span>
                  <span className="relative size-10 shrink-0">{find && <ProductImage src={find.image} sizes="2.5rem" />}</span>
                  <input
                    list="outfit-finds"
                    defaultValue={find ? optionLabel(find) : ""}
                    onChange={(e) => pickFind(i, e.target.value)}
                    placeholder="Wyszukaj find z katalogu…"
                    aria-label={`Find dla części ${i + 1}`}
                    className={`${field} h-10 min-w-0 flex-1 ${find ? "" : "border-amber-300/40"}`}
                  />
                  {preview && (
                    <button
                      type="button"
                      onClick={() => setPlacing(placing === i ? null : i)}
                      title="Przestaw punkt na zdjęciu"
                      className={`grid size-9 shrink-0 place-items-center rounded-lg border ${placing === i ? "border-fg text-fg" : "border-line text-muted hover:text-fg"}`}
                    >
                      <Crosshair aria-hidden size={15} />
                      <span className="sr-only">Przestaw punkt {i + 1}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setParts((list) => list.filter((_, j) => j !== i));
                      setPlacing(null);
                    }}
                    title="Usuń część"
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted hover:border-red-500/50 hover:text-red-300"
                  >
                    <Trash aria-hidden size={15} />
                    <span className="sr-only">Usuń część {i + 1}</span>
                  </button>
                </div>
                <input
                  value={p.label ?? ""}
                  onChange={(e) => update(i, { label: e.target.value })}
                  maxLength={60}
                  placeholder={find ? `Podpis (opcjonalnie), np. ${find.category}` : "Podpis (opcjonalnie)"}
                  aria-label={`Podpis części ${i + 1}`}
                  className={`${field} mt-2 h-9 text-[13px]`}
                />
              </li>
            );
          })}
        </ol>
      )}
      <p className="text-xs text-dim">
        {parts.length}/{MAX_OUTFIT_PARTS} części. Części bez wybranego findu nie zostaną zapisane.
      </p>

      <button
        type="submit"
        disabled={pending || !finds.length}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-fg font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
      >
        {pending ? "Zapisywanie…" : editing ? "Zapisz zmiany" : "Dodaj outfit"}
      </button>
    </form>
  );
}

function DeleteOutfit({ outfit, onDeleted }: { outfit: Outfit; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [, action, pending] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await deleteOutfit(prev, data);
    if (result.ok) onDeleted();
    return result;
  }, {});

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="grid size-9 place-items-center rounded-lg border border-line text-muted hover:border-red-500/50 hover:text-red-300"
        title="Usuń"
      >
        <Trash aria-hidden size={15} />
        <span className="sr-only">Usuń {outfit.title}</span>
      </button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={outfit.id} />
      <button type="submit" disabled={pending} className="h-9 rounded-lg bg-red-500/90 px-3 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60">
        {pending ? "…" : "Usuń"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-lg px-2.5 text-sm text-muted hover:text-fg">
        Nie
      </button>
    </form>
  );
}
