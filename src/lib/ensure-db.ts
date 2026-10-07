import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import dns from "node:dns";
import { Client } from "pg";
import { hashPassword, SEED_ACCOUNT_PASSWORD } from "@/lib/password";

dns.setDefaultResultOrder("ipv4first");

let boot: Promise<void> | null = null;

function migrationPath() {
  const candidates = [
    join(process.cwd(), "prisma/migrations/20261007120000_init_postgres/migration.sql"),
    join(process.cwd(), "migrations/20261007120000_init_postgres/migration.sql"),
  ];
  return candidates.find((path) => existsSync(path));
}

function dbUrl() {
  const url = (process.env.DATABASE_URL || "").trim();
  if (!url.startsWith("postgres")) return "";
  if (/sslmode=/i.test(url) || url.includes("localhost")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

async function applySchema() {
  const url = dbUrl();
  if (!url) {
    console.error("ensure-db: DATABASE_URL missing at runtime");
    return;
  }
  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 30_000,
  });
  await client.connect();
  try {
    const found = await client.query(`SELECT to_regclass('public."User"') AS rel`);
    if (found.rows[0]?.rel) return;
    const file = migrationPath();
    if (!file) {
      console.error("ensure-db: migration.sql not found");
      return;
    }
    console.log("ensure-db: applying Postgres schema");
    await client.query(readFileSync(file, "utf8"));
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function seedIfEmpty() {
  const { createPrismaClient } = await import("@/lib/create-prisma-client");
  const prisma = createPrismaClient();
  const users = await prisma.user.count();
  if (users > 0) return;
  const levels = Array.from({ length: 20 }, (_, i) => {
    const level = i + 1;
    return {
      level,
      requiredExp: Math.round(100 * (level - 1) ** 2.15),
      markPurchasePoints: 200 + (level - 1) * 150,
    };
  });
  await prisma.levelExp.createMany({ data: levels, skipDuplicates: true });
  await prisma.user.create({
    data: {
      nickname: "펠트딜러",
      passwordHash: hashPassword(SEED_ACCOUNT_PASSWORD),
      isDealerVerified: true,
      isAdmin: true,
      level: 8,
      exp: 7400,
      points: 8200,
    },
  });
  console.log("ensure-db: created admin 펠트딜러");
  await prisma.$disconnect();
}

export function ensureDb() {
  boot ??= applySchema()
    .then(seedIfEmpty)
    .catch((error) => {
      console.error("ensure-db failed", error);
    });
  return boot;
}
