"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Check, ImagePlus, Pencil, Plus, Search, Trash, X } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { Select } from "@/components/select";
import { agents, parseSource, platformLabel } from "@/lib/agents";
import { batches, categories, defaultWeight, type Category, type Find } from "@/lib/finds";
import { formatMoney } from "@/lib/money";
import { deleteFind, saveFind, type FormState } from "./actions";
import { AdminHeader } from "./admin-header";

const field =
  "h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-sm text-fg placeholder:text-dim focus:border-brand/60 focus:outline-none";
const label = "mb-1.5 block text-sm font-medium";

const dateFmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", year: "numeric" });

export function AdminDashboard({ finds }: { finds: Find[] }) {
  const [editing, setEditing] = useState<Find | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await saveFind(prev, data);
    if (result.ok) {
      setEditing(null);
      setFormKey((k) => k + 1);
    }
    return result;
  }, {});

  // Przy kilku tysiącach produktów lista pokazuje porcjami po 100
  const [limit, setLimit] = useState(100);
  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? finds.filter((f) => `${f.name} ${f.category} ${f.batch} ${f.id}`.toLowerCase().includes(q)) : finds;
  }, [finds, query]);
  const visible = matching.slice(0, limit);

  const startEdit = (find: Find) => {
    setEditing(find);
    setFormKey((k) => k + 1);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <AdminHeader active="/admin" />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* Formularz */}
        <div ref={formRef} className="scroll-mt-24 lg:sticky lg:top-20">
          <div className="rounded-[1.5rem] border border-line bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold tracking-[-0.02em]">
                {editing ? (
                  <>
                    Edytuj <span className="fancy text-[1.12em] text-brand-bright">item</span>
                  </>
                ) : (
                  <>
                    Dodaj <span className="fancy text-[1.12em] text-brand-bright">item</span>
                  </>
                )}
              </h1>
              {editing && (
                <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted hover:bg-bg hover:text-fg">
                  <X aria-hidden size={13} />
                  Anuluj
                </button>
              )}
            </div>
            {editing && <p className="mt-1 truncate text-sm text-muted">{editing.name}</p>}

            <FindForm key={formKey} editing={editing} action={action} pending={pending} />

            <div aria-live="polite">
              {state.error && (
                <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
                  {state.error}
                </p>
              )}
              {state.ok && !state.error && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gl/30 bg-gl/10 px-3.5 py-2.5 text-sm text-gl">
                  <Check aria-hidden size={15} />
                  {state.ok}. Strona główna już się zaktualizowała.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lista */}
        <section aria-labelledby="lista-title" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="lista-title" className="text-xl font-semibold tracking-[-0.02em]">
              Itemy <span className="ml-1 rounded-full border border-line bg-card px-2 py-0.5 font-mono text-xs text-muted">{finds.length}</span>
            </h2>
            <div className="flex h-10 w-full items-center gap-2 rounded-full border border-line bg-card px-3.5 sm:w-64">
              <Search aria-hidden size={15} className="text-dim" />
              <label htmlFor="admin-search" className="sr-only">
                Szukaj itemów
              </label>
              <input
                id="admin-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(100);
                }}
                placeholder="Szukaj po nazwie lub kategorii"
                className="h-full w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
              <p className="font-semibold">{finds.length === 0 ? "Nie ma jeszcze żadnych itemów." : "Nic nie pasuje do wyszukiwania."}</p>
              <p className="mt-1 text-sm text-muted">
                {finds.length === 0 ? "Dodaj pierwszy item w formularzu obok." : "Spróbuj innej nazwy albo wyczyść pole wyszukiwania."}
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {visible.map((f) => (
                <li key={f.id} className={`flex items-center gap-3.5 px-3.5 py-3 sm:px-4 ${editing?.id === f.id ? "bg-white/[0.04]" : ""}`}>
                  <span className="relative size-14 shrink-0">
                    <ProductImage src={f.image} sizes="3.5rem" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {f.category}, {f.batch}, {platformLabel[f.source.platform]}
                      {f.hidden && ", tylko w outfitach"}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-dim tabular">
                      {formatMoney(f.pricePln, "PLN", "pl-PL")} · {f.weightGrams} g · {f.views} wyśw. · {dateFmt.format(new Date(f.createdAt))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(f)}
                      className="grid size-9 place-items-center rounded-full text-muted hover:bg-bg hover:text-fg"
                      title="Edytuj"
                    >
                      <Pencil aria-hidden size={15} />
                      <span className="sr-only">Edytuj {f.name}</span>
                    </button>
                    <DeleteButton find={f} onDeleted={() => editing?.id === f.id && cancelEdit()} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {matching.length > visible.length && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + 100)}
              className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-line bg-card text-sm font-medium text-muted hover:border-line-strong hover:text-fg"
            >
              Pokaż kolejne ({visible.length} z {matching.length})
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

function FindForm({ editing, action, pending }: { editing: Find | null; action: (data: FormData) => void; pending: boolean }) {
  const [category, setCategory] = useState<Category>(editing?.category ?? "Bluzy");
  const [batch, setBatch] = useState<string>(editing?.batch ?? "Best batch");
  const [link, setLink] = useState(editing ? agents[0].productUrl(editing.source) : "");
  const [imageUrl, setImageUrl] = useState(editing?.image ?? "");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const source = parseSource(link);
  const preview = filePreview ?? (imageUrl || null);

  return (
    <form action={action} className="mt-5 space-y-4">
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <div>
        <label htmlFor="f-link" className={label}>
          Link do produktu
        </label>
        <input
          id="f-link"
          name="link"
          required
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="weidian.com/item.html?itemID=…"
          className={`${field} font-mono text-[0.8125rem]`}
        />
        <p className={`mt-1.5 text-xs ${link && !source ? "text-red-300" : "text-dim"}`}>
          {source ? (
            <>
              Rozpoznano: {platformLabel[source.platform]}, ID {source.id}.{" "}
              <a href={agents[0].productUrl(source)} target="_blank" rel="noopener noreferrer" className="text-brand-bright hover:underline">
                Podgląd na USFans
              </a>
            </>
          ) : link ? (
            "Nie rozpoznaję tego linku."
          ) : (
            "Weidian, Taobao, 1688 albo link od agenta (USFans, Kakobuy, Litbuy, Oopbuy)."
          )}
        </p>
      </div>

      <div>
        <label htmlFor="f-name" className={label}>
          Nazwa
        </label>
        <input id="f-name" name="name" required maxLength={140} defaultValue={editing?.name} placeholder="np. Corteiz Short" className={field} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span aria-hidden="true" className={label}>
            Kategoria
          </span>
          <Select
            look="field"
            label="Kategoria"
            name="category"
            value={category}
            onChange={(v) => setCategory(v as Category)}
            options={categories.map((c) => ({ value: c, label: c }))}
          />
        </div>
        <div>
          <span aria-hidden="true" className={label}>
            Batch
          </span>
          <Select look="field" label="Batch" name="batch" value={batch} onChange={setBatch} options={batches.map((b) => ({ value: b, label: b }))} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="f-price" className={label}>
            Cena (zł)
          </label>
          <input id="f-price" name="price" required inputMode="decimal" defaultValue={editing?.pricePln} placeholder="85" className={`${field} tabular`} />
        </div>
        <div>
          <label htmlFor="f-weight" className={label}>
            Waga (g)
          </label>
          <input
            id="f-weight"
            name="weight"
            inputMode="numeric"
            defaultValue={editing?.weightGrams}
            placeholder={String(defaultWeight[category])}
            className={`${field} tabular`}
          />
        </div>
        <div>
          <label htmlFor="f-views" className={label}>
            Wyśw.
          </label>
          <input id="f-views" name="views" inputMode="numeric" defaultValue={editing?.views ?? 0} className={`${field} tabular`} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-dim">Pusta waga = typowa dla kategorii ({defaultWeight[category]} g).</p>

      <div>
        <span className={label}>Zdjęcie</span>
        <div className="flex gap-3">
          <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-line bg-bg text-dim">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- podgląd lokalnego pliku przed wysłaniem
              <img src={preview} alt="Podgląd zdjęcia" className="size-full object-cover" />
            ) : (
              <ImagePlus aria-hidden size={22} />
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-bg text-sm text-muted hover:border-line-strong hover:text-fg">
              <ImagePlus aria-hidden size={16} />
              Wgraj plik
              <input
                type="file"
                name="imageFile"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (filePreview) URL.revokeObjectURL(filePreview);
                  setFilePreview(file ? URL.createObjectURL(file) : null);
                }}
              />
            </label>
            <label htmlFor="f-image" className="sr-only">
              Albo link do zdjęcia
            </label>
            <input
              id="f-image"
              name="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="albo link: https://…"
              className={`${field} h-10 text-[0.8125rem]`}
            />
          </div>
        </div>
        <p className="mt-1.5 text-xs text-dim">JPG, PNG, WEBP, AVIF lub GIF, do 4 MB.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-fg font-medium text-bg transition-colors hover:bg-white disabled:opacity-60"
      >
        {editing ? <Check aria-hidden size={17} /> : <Plus aria-hidden size={17} />}
        {pending ? "Zapisywanie…" : editing ? "Zapisz zmiany" : "Dodaj item"}
      </button>
    </form>
  );
}

function DeleteButton({ find, onDeleted }: { find: Find; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, data) => {
    const result = await deleteFind(prev, data);
    if (result.ok) onDeleted();
    return result;
  }, {});

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="grid size-9 place-items-center rounded-full text-muted hover:bg-red-500/10 hover:text-red-300"
        title="Usuń"
      >
        <Trash aria-hidden size={15} />
        <span className="sr-only">Usuń {find.name}</span>
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="id" value={find.id} />
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-full bg-red-500/90 px-3 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
      >
        {pending ? "Usuwanie…" : "Usuń na pewno"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="grid size-9 place-items-center rounded-full text-muted hover:bg-bg hover:text-fg">
        <X aria-hidden size={15} />
        <span className="sr-only">Nie usuwaj</span>
      </button>
      {state.error && (
        <span role="alert" className="sr-only">
          {state.error}
        </span>
      )}
    </form>
  );
}
