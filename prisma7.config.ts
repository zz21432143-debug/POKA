import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: url ? url : env("DATABASE_URL"),
  },
});
