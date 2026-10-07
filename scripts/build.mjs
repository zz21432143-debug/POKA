import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import dns from "node:dns";
import pg from "pg";

dns.setDefaultResultOrder("ipv4first");

function strip(value) {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

function withSsl(url) {
  if (!url) return url;
  if (/sslmode=/i.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

function withPgBouncer(url) {
  if (!url || /pgbouncer=/i.test(url)) return url;
  if (!/-pooler\./.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
}

const pooled = withSsl(strip(process.env.DATABASE_URL));
const direct = withSsl(strip(process.env.DATABASE_URL_UNPOOLED)) || pooled;
const migrateUrl = strip(process.env.DATABASE_URL_UNPOOLED)
  ? direct
  : withPgBouncer(pooled);

if (!pooled && !direct) {
  console.error(
    "DATABASE_URL 이 없습니다. Vercel → Settings → Environment Variables 에 Neon 주소를 넣으세요.",
  );
  process.exit(1);
}

if (!pooled.startsWith("postgres")) {
  console.error("DATABASE_URL 은 postgresql:// 로 시작해야 합니다.");
  process.exit(1);
}

writeFileSync(
  ".env",
  [
    `DATABASE_URL=${JSON.stringify(pooled)}`,
    `DATABASE_URL_UNPOOLED=${JSON.stringify(direct)}`,
  ].join("\n") + "\n",
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

console.log("Checking database connection…");
const client = new pg.Client({
  connectionString: migrateUrl,
  ssl: migrateUrl.includes("localhost") ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
});
try {
  await client.connect();
  await client.query("select 1");
  console.log("Database reachable.");
} catch (error) {
  console.error("Neon/Postgres 연결 실패. DATABASE_URL / DATABASE_URL_UNPOOLED 를 다시 확인하세요.");
  console.error(error);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}

run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "migrate", "deploy"], {
  DATABASE_URL: migrateUrl,
  DATABASE_URL_UNPOOLED: migrateUrl,
});
run("npx", ["prisma", "db", "seed"]);
run("npx", ["next", "build"]);
