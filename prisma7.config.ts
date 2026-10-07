import "dotenv/config";
import { defineConfig } from "prisma/config";

function databaseUrl() {
  const pooled = process.env.DATABASE_URL?.trim();
  const direct = process.env.DATABASE_URL_UNPOOLED?.trim();
  const url = pooled || direct || "postgresql://127.0.0.1:5432/postgres";
  if (/-pooler\./.test(url) && !/pgbouncer=/i.test(url)) {
    return `${url}${url.includes("?") ? "&" : "?"}pgbouncer=true`;
  }
  return url;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl(),
  },
});
