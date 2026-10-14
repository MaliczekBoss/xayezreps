import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { hostname } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const log = (message) => console.log(`[xayezreps] ${new Date().toISOString().slice(0, 19).replace("T", " ")} ${message}`);
const port = String(process.env.SERVER_PORT || process.env.PORT || 3000);
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const stateDir = path.join(root, ".xayezreps");
mkdirSync(stateDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const readState = (name) => {
  try {
    return readFileSync(path.join(stateDir, name), "utf8").trim();
  } catch {
    return "";
  }
};
const writeState = (name, value) => writeFileSync(path.join(stateDir, name), value);

async function withLock(name, done, work) {
  const lock = path.join(stateDir, `${name}.lock`);
  for (;;) {
    if (done()) return;
    try {
      closeSync(openSync(lock, "wx"));
      break;
    } catch {
      const age = existsSync(lock) ? Date.now() - statSync(lock).mtimeMs : 0;
      if (age > 30 * 60_000) rmSync(lock, { force: true });
      else {
        log(`Czekam, aż inna kopia skończy: ${name}…`);
        await sleep(5000);
      }
    }
  }
  try {
    if (!done()) await work();
  } finally {
    rmSync(lock, { force: true });
  }
}

function hashOf(entries) {
  const hash = createHash("sha256");
  const walk = (full) => {
    if (!existsSync(full)) return;
    if (statSync(full).isDirectory()) {
      for (const name of readdirSync(full).sort()) walk(path.join(full, name));
      return;
    }
    hash.update(path.relative(root, full).replaceAll("\\", "/"));
    hash.update(readFileSync(full));
  };
  for (const entry of entries) walk(path.join(root, entry));
  return hash.digest("hex");
}

function npm(args) {
  const result = spawnSync("npm", args, { cwd: root, stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, NODE_ENV: "development" } });
  return result.status === 0;
}

async function ensureDependencies() {
  const lock = hashOf(["package.json", "package-lock.json"]);
  const ready = () => existsSync(nextBin) && existsSync(path.join(root, "node_modules", "typescript")) && readState("dependencies") === lock;
  await withLock("install", ready, async () => {
    log("Instaluję zależności (npm ci)…");
    if (npm(["ci", "--include=dev", "--no-audit", "--no-fund"]) || npm(["install", "--include=dev", "--no-audit", "--no-fund"])) {
      writeState("dependencies", lock);
      return;
    }
    if (!existsSync(nextBin)) {
      log("Nie udało się zainstalować zależności – sprawdź, czy serwer ma dostęp do internetu i npm.");
      process.exit(1);
    }
    log("Instalacja się nie udała, używam zależności, które już są.");
  });
}

function loadEnv() {
  const require = createRequire(path.join(root, "package.json"));
  require("@next/env").loadEnvConfig(root, false);
}

const SOURCES = [
  "src",
  "public/agents",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "data/finds.json",
  "data/outfits.json",
  "data/sellers.json",
  "data/qc-index.json",
  "data/prices.json",
  "data/category-overrides.json",
  "data/gender.json",
  ".env",
  ".env.local",
  ".env.production",
  ".env.production.local",
];

function sharedBuildEnv(source) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "";
  return {
    XAYEZ_DEPLOYMENT_ID: source.slice(0, 16),
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:
      process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY || createHash("sha256").update(`xayezreps-server-actions|${secret}|${source}`).digest("base64"),
  };
}

async function ensureBuild(source, env) {
  const ready = () => existsSync(path.join(root, ".next", "BUILD_ID")) && readState("build") === source;
  await withLock("build", ready, async () => {
    log("Buduję stronę (pierwszy start albo nowa wersja plików) – to potrwa kilka minut…");
    const result = spawnSync(process.execPath, [nextBin, "build"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ...env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
    });
    if (result.status !== 0) {
      log("Build się nie udał – szczegóły wyżej.");
      process.exit(1);
    }
    writeState("build", source);
  });
}

const mongoReady = () => /^mongodb(\+srv)?:\/\//.test(process.env.MONGODB_URI ?? "");

async function seedDatabase() {
  if (!mongoReady()) {
    log("Brak MONGODB_URI – strona działa bez bazy (dane tylko w pamięci, do testów).");
    return;
  }
  try {
    const { seed } = await import("./mongo-seed.mjs");
    await seed(root, log);
  } catch (error) {
    log(`Wgrywanie danych do MongoDB nie powiodło się: ${error.message} – strona startuje mimo to.`);
  }
}

function cronSecret() {
  const own = process.env.CRON_SECRET ?? "";
  if (own.length >= 16) return own;
  const generated = randomBytes(32).toString("base64url");
  process.env.CRON_SECRET = generated;
  return generated;
}

async function cronClaim() {
  if (!mongoReady()) return async () => true;
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const named = client.db(process.env.MONGODB_DB || undefined);
  const db = named.databaseName === "test" && !process.env.MONGODB_DB ? client.db("xayezreps") : named;
  const runs = db.collection("cron_runs");
  return async (id) => {
    try {
      await runs.insertOne({ _id: id, at: new Date(), host: hostname() });
      return true;
    } catch (error) {
      if (error?.code === 11000) return false;
      throw error;
    }
  };
}

async function schedule(secret) {
  const plan = (process.env.CRON_SCHEDULE || "qc=04:00,prices=04:30")
    .split(",")
    .map((part) => part.trim().split("="))
    .filter(([job, time]) => /^[a-z]+$/.test(job ?? "") && /^\d{1,2}:\d{2}$/.test(time ?? ""))
    .map(([job, time]) => ({ job, minutes: Number(time.split(":")[0]) * 60 + Number(time.split(":")[1]) }));
  log(`Zadania cykliczne (UTC): ${plan.map((p) => `${p.job} ${String(Math.floor(p.minutes / 60)).padStart(2, "0")}:${String(p.minutes % 60).padStart(2, "0")}`).join(", ")}`);
  const claim = await cronClaim();

  const tick = async () => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    for (const { job, minutes: at } of plan) {
      if (minutes < at || readState(`cron-${job}`) === day) continue;
      writeState(`cron-${job}`, day);
      try {
        if (!(await claim(`${job}:${day}`))) {
          log(`Zadanie ${job} na dziś zrobiła już inna kopia strony.`);
          continue;
        }
        log(`Start zadania ${job}…`);
        const res = await fetch(`http://127.0.0.1:${port}/api/cron/${job}`, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10 * 60_000) });
        log(`Zadanie ${job}: ${res.status} ${(await res.text()).slice(0, 300)}`);
      } catch (error) {
        log(`Zadanie ${job} nie powiodło się: ${error.message}`);
      }
    }
  };
  setTimeout(tick, 60_000);
  setInterval(tick, 60_000);
}

await ensureDependencies();
loadEnv();
await seedDatabase();
const source = hashOf(SOURCES);
const shared = sharedBuildEnv(source);
await ensureBuild(source, shared);
const secret = cronSecret();

log(`Uruchamiam serwer na porcie ${port}…`);
const server = spawn(process.execPath, [nextBin, "start", "-p", port, "-H", "0.0.0.0"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, ...shared, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", CRON_SECRET: secret },
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code ?? 1));
await schedule(secret);
