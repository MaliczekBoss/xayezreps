import type { Category } from "./finds";

export const normalize = (s: string) =>
  s
    .toLocaleLowerCase("pl")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .replace(/[-'’`.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

type Group = { q: string[]; n: string[]; category?: Category };

const g = (q: string[], n: string[], category?: Category): Group => ({ q, n, category });

const GROUPS: Group[] = [
  g(["koszulka", "koszulki", "koszulk*", "tshirt*", "tee", "tees", "teeshirt*", "tiszert*"], ["tee", "tees", "tshirt*", "teeshirt*", "koszulk*", "longsleeve*", "jersey*", "polo", "polos"], "Koszulki"),
  g(["koszula", "koszule", "koszuli", "shirt", "shirts"], ["shirt", "shirts", "koszula", "koszule", "flannel*", "overshirt*"]),
  g(["bluza", "bluzy", "bluz*", "hoodie*", "hoody", "sweatshirt*"], ["hoodie*", "hoody", "sweatshirt*", "crewneck*", "zipup", "bluz*"], "Bluzy"),
  g(["sweter", "swetry", "swetr*", "sweater*"], ["sweater*", "knit*", "cardigan*", "sweter", "swetr*"], "Swetry"),
  g(["kurtka", "kurtki", "kurtk*", "jacket*"], ["jacket*", "puffer*", "windbreaker*", "coat*", "parka*", "bomber*", "anorak*", "kurtk*"], "Kurtki"),
  g(["plaszcz", "plaszcz*", "coat", "coats"], ["coat*", "trench*", "plaszcz*"]),
  g(["kamizelka", "kamizel*", "vest*", "gilet*"], ["vest*", "gilet*", "kamizel*"]),
  g(["spodnie", "spodni*", "pants", "pant", "trousers"], ["pants", "pant", "trousers", "sweatpants", "joggers", "jeans*", "spodni*"], "Spodnie"),
  g(["jeansy", "dzinsy", "dzins*", "jeans*"], ["jeans*", "denim*", "dzins*"]),
  g(["spodenki", "spoden*", "szorty", "szort*", "shorts", "short"], ["shorts", "jorts", "spoden*", "szort*"], "Spodenki"),
  g(["spodnica", "spodnic*", "skirt*"], ["skirt*", "spodnic*"], "Spódnice"),
  g(["dres", "dresy", "dresu", "dresie", "dresow*", "tracksuit*"], ["tracksuit*", "dres", "dresy"], "Komplety"),
  g(["komplet", "komplety", "komplet*", "zestaw*", "set", "sets"], ["set", "sets", "komplet*"], "Komplety"),
  g(["bielizna", "bieliz*", "majtki", "majt*", "bokserki", "bokser*", "slipy", "stringi", "underwear", "boxer*", "briefs"], ["underwear", "boxer*", "briefs", "thong*", "bokser*", "majt*", "bieliz*"], "Bielizna"),
  g(["skarpetki", "skarpet*", "socks", "sock"], ["socks", "sock", "skarpet*"]),
  g(["kapielowki", "kapielow*", "bikini*", "swim*", "kostium*"], ["bikini*", "swim*", "kapielow*"]),
  g(["buty", "but", "butow", "butach", "butami", "buta", "obuwie", "shoes", "shoe", "sneaker*", "trampki", "trampk*", "trainers"], ["shoes", "shoe", "sneaker*", "trainers", "buty", "trampk*"], "Buty"),
  g(["klapki", "klapk*", "slides", "slide", "slippers", "sandal*"], ["slides", "slide", "slippers", "sandal*", "klapk*"]),
  g(["kozaki", "trzewik*", "boots", "boot"], ["boots", "boot", "kozaki"]),
  g(["czapka", "czapki", "czap*", "cap", "caps", "hat", "hats"], ["cap", "caps", "hat", "hats", "beanie*", "bucket", "snapback*", "trucker", "czap*"], "Czapki"),
  g(["torba", "torby", "torb*", "torebka", "torebk*", "bag", "bags", "nerka", "nerk*", "saszetk*"], ["bag", "bags", "tote*", "handbag*", "crossbody", "pouch", "backpack*", "duffle*", "torb*", "torebk*"], "Torby"),
  g(["plecak", "plecak*", "backpack*"], ["backpack*", "plecak*"]),
  g(["portfel", "portfel*", "portmonetk*", "wallet*"], ["wallet*", "cardholder*", "portfel*"]),
  g(["pasek", "paski", "paska", "pas", "belt*"], ["belt*", "pasek", "paski"], "Paski"),
  g(["okulary", "okular*", "sunglasses", "glasses"], ["sunglasses", "glasses", "shades", "okular*"]),
  g(["zegarek", "zegarki", "zegar*", "watch*"], ["watch*", "zegar*"], "Zegarki"),
  g(["bizuteria", "bizuteri*", "jewelry", "jewellery"], ["jewelry", "jewellery"], "Biżuteria"),
  g(["lancuszek", "lancuszk*", "lancuch*", "naszyjnik*", "chain*", "necklace*"], ["chain*", "necklace*", "pendant*", "naszyjnik*"]),
  g(["bransoletka", "bransolet*", "bracelet*"], ["bracelet*", "bransolet*"]),
  g(["pierscionek", "pierscion*", "pierscien*", "sygnet*", "ring", "rings"], ["ring", "rings"]),
  g(["kolczyki", "kolczyk*", "earring*"], ["earring*"]),
  g(["perfumy", "perfum*", "zapach*", "perfume*", "fragrance*"], ["perfume*", "fragrance*", "cologne", "parfum", "perfum*"], "Perfumy"),
  g(["etui", "case", "cases"], ["case", "cases", "etui"]),
  g(["telefon", "telefon*", "phone*"], ["phone*", "iphone*"]),
  g(["sluchawki", "sluchaw*", "headphones", "earbuds"], ["airpods*", "headphones", "earbuds", "beats"]),
  g(["klocki", "kloc*", "lego", "bricks"], ["lego", "bricks"], "Klocki"),
  g(["czarny", "czarn*", "black"], ["black", "czarn*"]),
  g(["bialy", "bial*", "white"], ["white", "bial*"]),
  g(["szary", "szar*", "grey", "gray"], ["grey", "gray", "szar*"]),
  g(["niebieski", "niebiesk*", "blekitn*", "blue"], ["blue", "niebiesk*"]),
  g(["granatowy", "granatow*", "navy"], ["navy", "granatow*"]),
  g(["czerwony", "czerwon*", "red"], ["red", "czerwon*"]),
  g(["zielony", "zielon*", "green"], ["green", "olive", "zielon*"]),
  g(["rozowy", "rozow*", "pink"], ["pink", "rozow*"]),
  g(["brazowy", "brazow*", "brown"], ["brown", "brazow*"]),
  g(["bezowy", "bezow*", "kremow*", "beige", "cream"], ["beige", "cream", "tan", "bezow*"]),
  g(["zolty", "zolt*", "yellow"], ["yellow", "zolt*"]),
  g(["pomaranczowy", "pomarancz*", "orange"], ["orange", "pomarancz*"]),
  g(["fioletowy", "fiolet*", "purple"], ["purple", "fiolet*"]),
  g(["srebrny", "srebrn*", "silver"], ["silver", "srebrn*"]),
  g(["zloty", "zlot*", "gold"], ["gold", "zlot*"]),
  g(["lv", "louis", "vuitton", "vuiton", "viton"], ["lv", "louis", "vuitton"]),
  g(["ysl", "saint", "laurent"], ["ysl", "saint", "laurent"]),
  g(["tnf", "northface"], ["tnf", "north"]),
  g(["cdg"], ["cdg", "comme"]),
  g(["af1"], ["af1", "force"]),
];

const STOP = new Set(["i", "a", "w", "z", "ze", "na", "do", "od", "dla", "po", "the", "and", "for", "with", "of", "rep", "reps", "replika", "repliki", "find", "findy"]);

export type Searchable = { id: string; name: string; category?: string };

type Indexed = { words: string[]; compact: string; category?: string };

export type SearchIndex = {
  byId: Map<string, Indexed>;
  vocab: Map<string, number>;
};

export type SearchResult<T> = {
  items: T[];
  corrected: string | null;
  relaxed: boolean;
};

const matchesWord = (pattern: string, word: string) => (pattern.endsWith("*") ? word.startsWith(pattern.slice(0, -1)) : word === pattern);

const groupsOf = (token: string) => GROUPS.filter((group) => group.q.some((p) => matchesWord(p, token)));

export function buildSearchIndex(finds: Searchable[]): SearchIndex {
  const byId = new Map<string, Indexed>();
  const vocab = new Map<string, number>();
  for (const f of finds) {
    const words = normalize(f.name).split(" ").filter(Boolean);
    byId.set(f.id, { words, compact: words.join(""), category: f.category });
    for (const w of words) if (w.length >= 3) vocab.set(w, (vocab.get(w) ?? 0) + 1);
  }
  for (const group of GROUPS) for (const w of group.q) if (!w.endsWith("*") && !vocab.has(w)) vocab.set(w, 0);
  return { byId, vocab };
}

function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2.splice(0, prev2.length, ...prev);
    prev = cur;
  }
  return prev[b.length];
}

function corrections(token: string, vocab: Map<string, number>) {
  if (token.length < 4 || /^\d+$/.test(token)) return [];
  const max = token.length >= 7 ? 2 : 1;
  let best = max + 1;
  let found: string[] = [];
  for (const word of vocab.keys()) {
    const d = distance(token, word, max);
    if (d < best) {
      best = d;
      found = [word];
    } else if (d === best && d <= max) found.push(word);
  }
  return found.sort((a, b) => (vocab.get(b) ?? 0) - (vocab.get(a) ?? 0));
}

type Token = { raw: string; groups: Group[]; fixes: string[] };

function scoreToken(t: Token, item: Indexed) {
  let score = 0;
  const exact = t.groups.length > 0 && t.raw.length < 5;
  if (item.words.some((w) => (exact ? w === t.raw : w.startsWith(t.raw)))) score = 3;
  else if (!exact && t.raw.length >= 4 && item.compact.includes(t.raw)) score = 2;
  for (const group of t.groups) {
    if (group.n.some((p) => item.words.some((w) => matchesWord(p, w)))) score = Math.max(score, 2.5);
    else if (group.category === item.category) score = Math.max(score, 1);
  }
  if (!score && t.fixes.some((fix) => item.words.includes(fix))) score = 1.5;
  return score;
}

export function searchFinds<T extends Searchable>(index: SearchIndex, finds: T[], query: string): SearchResult<T> {
  const raw = normalize(query)
    .split(" ")
    .filter((w) => w && !STOP.has(w));
  if (raw.length === 0) return { items: finds, corrected: null, relaxed: false };

  const vocab = [...index.vocab.keys()];
  const known = (w: string) => groupsOf(w).length > 0 || vocab.some((v) => v.startsWith(w));
  const tokens: Token[] = raw.map((w) => {
    const fixes = known(w) ? [] : corrections(w, index.vocab);
    return { raw: w, groups: [...groupsOf(w), ...fixes.flatMap(groupsOf)], fixes };
  });

  const scored: { find: T; score: number; hits: number }[] = [];
  for (const find of finds) {
    const item = index.byId.get(find.id);
    if (!item) continue;
    let score = 0;
    let hits = 0;
    for (const t of tokens) {
      const s = scoreToken(t, item);
      if (s > 0) {
        score += s;
        hits++;
      }
    }
    if (hits) scored.push({ find, score, hits });
  }

  const corrected = tokens.some((t) => t.fixes.length) ? tokens.map((t) => t.fixes[0] ?? t.raw).join(" ") : null;
  let matching = scored.filter((s) => s.hits === tokens.length);
  let relaxed = false;
  if (matching.length === 0 && tokens.length > 1) {
    const most = Math.max(0, ...scored.map((s) => s.hits));
    matching = scored.filter((s) => s.hits === most);
    relaxed = matching.length > 0;
  }
  matching.sort((a, b) => b.score - a.score);
  return { items: matching.map((s) => s.find), corrected, relaxed };
}
