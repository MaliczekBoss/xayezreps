import "server-only";

// Magazyn statystyk: Upstash Redis przez REST, a bez konfiguracji – pamięć procesu (tylko do testów lokalnych).
// Wszystkie komendy jednej operacji idą jednym skryptem Lua, więc wejście na stronę to jedna komenda w rozliczeniu Upstash.

export type Cmd = { op: string; keys: string[]; args?: (string | number)[] };

const URL_ENV = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN_ENV = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

export const storageKind = (): "redis" | "memory" => (URL_ENV && TOKEN_ENV ? "redis" : "memory");

export async function run(cmds: Cmd[]): Promise<unknown[]> {
  if (cmds.length === 0) return [];
  return storageKind() === "redis" ? runRedis(cmds) : runMemory(cmds);
}

/* ---------- Upstash Redis ---------- */

// Wykonuje listę komend podaną w ARGV[1]: [op, liczba kluczy, indeksy kluczy…, argumenty…]
const SCRIPT = `
local cmds = cjson.decode(ARGV[1])
local out = {}
for i, c in ipairs(cmds) do
  local args = {}
  local nk = c[2]
  for j = 1, nk do args[j] = KEYS[c[2 + j]] end
  for j = 3 + nk, #c do args[#args + 1] = c[j] end
  out[i] = redis.call(c[1], unpack(args))
end
return out
`;

let evalBroken = false;

async function rest(path: string, body: unknown) {
  const res = await fetch(`${URL_ENV}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN_ENV}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  return res.json() as Promise<unknown>;
}

async function runRedis(cmds: Cmd[]): Promise<unknown[]> {
  if (!evalBroken) {
    const keys: string[] = [];
    const index = new Map<string, number>();
    const encoded = cmds.map((c) => [
      c.op,
      c.keys.length,
      ...c.keys.map((k) => {
        if (!index.has(k)) {
          keys.push(k);
          index.set(k, keys.length);
        }
        return index.get(k)!;
      }),
      ...(c.args ?? []).map(String),
    ]);
    const reply = (await rest("", ["EVAL", SCRIPT, String(keys.length), ...keys, JSON.stringify(encoded)])) as { result?: unknown[]; error?: string };
    if (Array.isArray(reply.result)) return reply.result;
    // Gdyby skrypty Lua były niedostępne, przechodzimy na zwykły pipeline
    console.error("[stats] EVAL nie działa, przechodzę na pipeline:", reply.error);
    evalBroken = true;
  }
  const reply = (await rest("/pipeline", cmds.map((c) => [c.op, ...c.keys, ...(c.args ?? []).map(String)]))) as { result?: unknown }[];
  return Array.isArray(reply) ? reply.map((r) => r?.result ?? null) : [];
}

/* ---------- Pamięć (dev) ---------- */

type Mem = { hashes: Map<string, Map<string, number>>; hll: Map<string, Set<string>>; zsets: Map<string, Map<string, number>> };

const mem: Mem = ((globalThis as { __xayezStats?: Mem }).__xayezStats ??= { hashes: new Map(), hll: new Map(), zsets: new Map() });

const num = (x: unknown) => (x === "-inf" ? -Infinity : x === "+inf" ? Infinity : Number(x));

function get<T>(map: Map<string, T>, key: string, make: () => T) {
  let v = map.get(key);
  if (!v) map.set(key, (v = make()));
  return v;
}

async function runMemory(cmds: Cmd[]): Promise<unknown[]> {
  return cmds.map(({ op, keys, args = [] }) => {
    const [key] = keys;
    switch (op) {
      case "HINCRBY": {
        const h = get(mem.hashes, key, () => new Map<string, number>());
        const field = String(args[0]);
        const next = (h.get(field) ?? 0) + Number(args[1]);
        h.set(field, next);
        return next;
      }
      case "HGETALL":
        return [...(mem.hashes.get(key) ?? new Map<string, number>())].flatMap(([f, v]) => [f, String(v)]);
      case "PFADD": {
        const s = get(mem.hll, key, () => new Set<string>());
        const before = s.size;
        args.forEach((a) => s.add(String(a)));
        return s.size > before ? 1 : 0;
      }
      case "PFCOUNT": {
        const all = new Set<string>();
        keys.forEach((k) => mem.hll.get(k)?.forEach((v) => all.add(v)));
        return all.size;
      }
      case "ZADD":
        get(mem.zsets, key, () => new Map<string, number>()).set(String(args[1]), Number(args[0]));
        return 1;
      case "ZREMRANGEBYSCORE": {
        const z = mem.zsets.get(key);
        if (!z) return 0;
        const [min, max] = [num(args[0]), num(args[1])];
        let n = 0;
        for (const [m, score] of z) if (score >= min && score <= max && z.delete(m)) n++;
        return n;
      }
      case "ZRANGE":
        return [...(mem.zsets.get(key) ?? new Map<string, number>())].sort((a, b) => a[1] - b[1]).map(([m]) => m);
      case "EXPIRE":
        return 1;
      default:
        throw new Error(`Nieobsługiwana komenda: ${op}`);
    }
  });
}

/** Spłaszczona odpowiedź HGETALL na obiekt liczb */
export function toCounts(reply: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!Array.isArray(reply)) return out;
  for (let i = 0; i + 1 < reply.length; i += 2) out[String(reply[i])] = Number(reply[i + 1]) || 0;
  return out;
}
