import "dotenv/config";
import dns from "node:dns";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

dns.setDefaultResultOrder("ipv4first");

export function isPostgresUrl(url: string | undefined): url is string {
  return !!url && (url.startsWith("postgres://") || url.startsWith("postgresql://"));
}

export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!isPostgresUrl(connectionString)) {
    throw new Error(
      "DATABASE_URL 에 PostgreSQL 주소가 필요합니다. Neon은 -pooler 가 들어 있는 문자열을 쓰세요.",
    );
  }
  const ssl = connectionString.includes("localhost")
    ? undefined
    : { rejectUnauthorized: false as const };
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max: 4,
      ssl,
    }),
  });
}
