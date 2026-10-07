"use strict";

const { writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const dns = require("node:dns");
const { Client } = require("pg");

dns.setDefaultResultOrder("ipv4first");

function strip(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
}

function withParam(url, key, val) {
  if (!url || new RegExp(`[?&]${key}=`, "i").test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${val}`;
}

function prepare(url, { pooler } = {}) {
  let out = withParam(strip(url), "sslmode", "require");
  if (pooler || /-pooler\./.test(out)) {
    out = withParam(out, "pgbouncer", "true");
    out = withParam(out, "connect_timeout", "30");
  }
  return out;
}

function describeUrl(name, url) {
  if (!url) {
    console.log(`${name}: missing`);
    return;
  }
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    host = "(unparseable)";
  }
  console.log(
    `${name}: set len=${url.length} host=${host} neon=${url.includes("neon.tech")} pooler=${url.includes("-pooler")}`,
  );
}

const rawPooled = strip(process.env.DATABASE_URL);
const rawDirect = strip(process.env.DATABASE_URL_UNPOOLED);
const pooled = rawPooled ? prepare(rawPooled, { pooler: true }) : "";
const direct = rawDirect ? prepare(rawDirect) : pooled;

console.log("VERCEL", process.env.VERCEL || "0", "VERCEL_ENV", process.env.VERCEL_ENV || "-");
describeUrl("DATABASE_URL", pooled);
describeUrl("DATABASE_URL_UNPOOLED", rawDirect ? direct : "");

if (!pooled.startsWith("postgres")) {
  console.error(
    "DATABASE_URL 이 빌드에 없습니다. Vercel → poka → Settings → Environment Variables 에서 Production 체크 후 값을 다시 저장하세요.",
  );
  process.exit(1);
}

writeFileSync(
  ".env",
  [`DATABASE_URL=${JSON.stringify(pooled)}`, `DATABASE_URL_UNPOOLED=${JSON.stringify(direct)}`].join("\n") + "\n",
);

process.env.DATABASE_URL = pooled;
process.env.DATABASE_URL_UNPOOLED = direct;

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function tryConnect(label, url) {
  console.log(`Checking database (${label})…`);
  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 60_000,
  });
  try {
    await client.connect();
    await client.query("select 1");
    console.log(`Database reachable (${label}).`);
    return true;
  } catch (error) {
    console.error(`Database connection failed (${label}):`, error && error.message ? error.message : error);
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const candidates = [];
  if (pooled) candidates.push(["pooler", pooled]);
  if (direct && direct !== pooled) candidates.push(["direct", direct]);

  let working = "";
  for (const [label, url] of candidates) {
    if (await tryConnect(label, url)) {
      working = url;
      break;
    }
  }

  if (!working) {
    console.error("Neon에 연결하지 못했습니다. DATABASE_URL 은 Connect에서 pooling ON(-pooler) 문자열이어야 합니다.");
    process.exit(1);
  }

  process.env.DATABASE_URL = working;
  writeFileSync(
    ".env",
    [`DATABASE_URL=${JSON.stringify(working)}`, `DATABASE_URL_UNPOOLED=${JSON.stringify(direct || working)}`].join("\n") +
      "\n",
  );

  run("npx", ["prisma", "generate"]);
  run("npx", ["prisma", "migrate", "deploy"], {
    DATABASE_URL: working,
    DATABASE_URL_UNPOOLED: working,
  });
  run("npx", ["prisma", "db", "seed"], { DATABASE_URL: working });
  run("npx", ["next", "build"]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
