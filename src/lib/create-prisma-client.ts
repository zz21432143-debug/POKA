import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export function isPostgresUrl(url: string | undefined): url is string {
  return !!url && (url.startsWith("postgres://") || url.startsWith("postgresql://"));
}

export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!isPostgresUrl(connectionString)) {
    throw new Error(
      "DATABASE_URL 에 PostgreSQL 주소가 필요합니다. Neon은 -pooler 가 들어 있는 문자열을 쓰세요.",
    );
  }
  const adapter = connectionString.includes("neon.tech")
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString, max: 8 });
  return new PrismaClient({ adapter });
}
