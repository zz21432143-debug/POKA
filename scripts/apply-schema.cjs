"use strict";

/**
 * Vercel 빌드 첫 단계. 새 코드가 배포되기 전에 DB에 필요한 칸·테이블을 먼저 만듭니다.
 * 실행하는 SQL은 모두 여러 번 돌려도 안전한(IF NOT EXISTS) 마이그레이션입니다.
 * 기존 코드는 새로 생긴 칸을 무시하므로, 배포 중에도 사이트가 깨지지 않습니다.
 *
 * - DATABASE_URL 이 없으면(로컬 빌드 등) 건너뜁니다.
 * - DB에 연결했는데 실패하면 빌드를 멈춥니다. 그러면 지금 배포된 사이트가 그대로 유지됩니다.
 */

const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const dns = require("node:dns");
const { Client } = require("pg");

dns.setDefaultResultOrder("ipv4first");

const FILES = [
  "prisma/migrations/20261011150000_jobs_v2_sync/migration.sql",
  "prisma/migrations/20261012100000_tournament_jobs/migration.sql",
  "prisma/migrations/20261012180000_tda_board_job_events/migration.sql",
  "prisma/migrations/20261013090000_uploaded_images/migration.sql",
  "prisma/migrations/20261013120000_doc_pdf/migration.sql",
  "prisma/migrations/20261013150000_upload_chunks/migration.sql",
  "prisma/migrations/20261014090000_job_title_no_guin/migration.sql",
  "prisma/migrations/20261014120000_admin_alerts_words/migration.sql",
  "prisma/migrations/20261014150000_post_photos/migration.sql",
  "prisma/migrations/20261014160000_job_tax/migration.sql",
  "prisma/migrations/20261014170000_visit_stats/migration.sql",
  "prisma/migrations/20261014180000_job_lodging/migration.sql",
  "prisma/migrations/20261014190000_content_plan_skip/migration.sql",
  "prisma/migrations/20261015090000_dealer_rotation/migration.sql",
  "prisma/migrations/20261015120000_rotation_plan/migration.sql",
  "prisma/migrations/20261015150000_rotation_tables/migration.sql",
  "prisma/migrations/20261015180000_rotation_table_state/migration.sql",
  "prisma/migrations/20261016090000_rotation_end_time/migration.sql",
  "prisma/migrations/20261016120000_rotation_games/migration.sql",
  "prisma/migrations/20261016150000_rotation_owner_share/migration.sql",
  "prisma/migrations/20261017090000_pot_title_settings/migration.sql",
  "prisma/migrations/20261018090000_game_board/migration.sql",
  "prisma/migrations/20261019090000_session_version/migration.sql",
  "prisma/migrations/20261020090000_tool_saved/migration.sql",
  "prisma/migrations/20261021090000_rotation_share_days/migration.sql",
  "prisma/migrations/20261022090000_daily_quiz/migration.sql",
  "prisma/migrations/20261023090000_quiz_alerts/migration.sql",
];

function databaseUrl() {
  const raw = String(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (!raw.startsWith("postgres")) return "";
  if (/sslmode=/i.test(raw) || raw.includes("localhost")) return raw;
  return `${raw}${raw.includes("?") ? "&" : "?"}sslmode=require`;
}

async function main() {
  const url = databaseUrl();
  if (!url) {
    console.log("apply-schema: DATABASE_URL 없음, 건너뜁니다.");
    return;
  }
  const client = new Client({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 60_000,
  });
  await client.connect();
  try {
    for (const file of FILES) {
      const sql = readFileSync(join(process.cwd(), file), "utf8");
      await client.query(sql);
      console.log(`apply-schema: ${file} 적용 완료`);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("apply-schema 실패:", error && error.message ? error.message : error);
  process.exit(1);
});
