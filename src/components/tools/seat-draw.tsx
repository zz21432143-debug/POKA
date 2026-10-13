"use client";

import { useRef, useState } from "react";
import { cn } from "cn";
import { drawResultText, drawSeats, parsePlayers, type DrawResult } from "@/lib/seat-draw";
import { BRAND_FONT, FOOTER_H, PRINT_FOOTER, PRINT_ON_LOAD, drawCredit, drawLogo, loadLogo, printHeader, saveCanvas } from "@/components/tools/brand-canvas";

const won = (n: number) => Math.round(n).toLocaleString("ko-KR");

/** 결과를 이미지(PNG)로 그려 내려받습니다. 오른쪽 위 POKA 로고, 맨 아래 출처 띠 */
async function downloadImage(result: DrawResult, title: string) {
  const logo = await loadLogo();
  const cols = Math.min(4, result.tables.length);
  const rowsMax = Math.max(...result.tables.map((t) => t.players.length));
  const cardW = 300;
  const cardH = 70 + rowsMax * 26;
  const pad = 20;
  const rows = Math.ceil(result.tables.length / cols);
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = (pad + cols * (cardW + pad)) * scale;
  const width = pad + cols * (cardW + pad);
  const height = 90 + rows * (cardH + pad) + FOOTER_H;
  canvas.width = Math.max(width, 420) * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f5d76e";
  ctx.font = `900 26px ${BRAND_FONT}`;
  ctx.fillText(title, pad, 42);
  drawLogo(ctx, logo, Math.max(width, 420) - 76, 8, 64);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `700 14px ${BRAND_FONT}`;
  ctx.fillText(`테이블 평균 차이 ${won(result.averageSpread)} · 전체 평균 ${won(result.overallAverage)}`, pad, 66);
  result.tables.forEach((table, index) => {
    const x = pad + (index % cols) * (cardW + pad);
    const y = 90 + Math.floor(index / cols) * (cardH + pad);
    ctx.fillStyle = "#18181b";
    ctx.fillRect(x, y, cardW, cardH);
    ctx.fillStyle = "#34d399";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`${table.table}번 테이블`, x + 12, y + 30);
    ctx.fillStyle = "#d4d4d8";
    ctx.font = "13px sans-serif";
    ctx.fillText(`${table.players.length}명 · 합계 ${won(table.total)} · 평균 ${won(table.average)}`, x + 12, y + 52);
    table.players.forEach((player, i) => {
      const py = y + 80 + i * 26;
      ctx.fillStyle = "#f5d76e";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(`${player.seat}`, x + 12, py);
      ctx.fillStyle = "#ffffff";
      ctx.font = "15px sans-serif";
      ctx.fillText(player.name.slice(0, 12), x + 44, py);
      ctx.fillStyle = "#a1a1aa";
      ctx.textAlign = "right";
      ctx.fillText(won(player.chips), x + cardW - 12, py);
      ctx.textAlign = "left";
    });
  });
  drawCredit(ctx, Math.max(width, 420), height);
  saveCanvas(canvas, `${title.replace(/\s+/g, "_")}.png`);
}

/** 싯드로우: 칩 균형 + 좌석 무작위 배정 */
export function SeatDraw() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [tableCount, setTableCount] = useState("5");
  const [seats, setSeats] = useState("9");
  const [firstTable, setFirstTable] = useState("1");
  const [title, setTitle] = useState("싯드로우");
  const [result, setResult] = useState<DrawResult | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const parsed = parsePlayers(text);

  function run() {
    setCopied(false);
    const tables = Number(tableCount);
    const perTable = Number(seats);
    const errors = [...parsed.errors];
    if (parsed.players.length === 0) errors.unshift("진출자 명단을 넣어 주세요.");
    if (!(tables >= 1)) errors.unshift("테이블 수를 확인하세요.");
    const names = parsed.players.map((p) => p.name);
    const dup = names.filter((name, i) => names.indexOf(name) !== i);
    if (dup.length) errors.push(`이름이 겹칩니다: ${[...new Set(dup)].join(", ")} (구분되게 고쳐 주세요)`);
    if (parsed.players.length === 0 || !(tables >= 1)) {
      setNotes(errors);
      setResult(null);
      return;
    }
    try {
      setResult(drawSeats(parsed.players, { tableCount: tables, seatsPerTable: perTable || 9, firstTable: Number(firstTable) || 1 }));
      setNotes(errors);
    } catch (err) {
      setNotes([err instanceof Error ? err.message : "배정하지 못했습니다.", ...errors]);
      setResult(null);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      setNotes(["엑셀 파일은 '다른 이름으로 저장 → CSV'로 바꿔 올려 주세요. 또는 엑셀에서 이름·칩 두 칸을 복사해 아래 칸에 붙여넣어도 됩니다."]);
      return;
    }
    setText(await file.text());
    if (fileRef.current) fileRef.current.value = "";
  }

  function print() {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const cards = result.tables
      .map(
        (t) => `<section><h2>${t.table}번 테이블</h2><p>${t.players.length}명 · 합계 ${won(t.total)} · 평균 ${won(t.average)}</p><table>${t.players
          .map((p) => `<tr><td class="s">${p.seat}</td><td>${p.name.replace(/</g, "&lt;")}</td><td class="c">${won(p.chips)}</td></tr>`)
          .join("")}</table></section>`,
      )
      .join("");
    w.document.write(`<!doctype html><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title><style>
      body{font-family:sans-serif;margin:16px} h1{margin:0 0 4px} .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      section{border:1px solid #999;border-radius:8px;padding:8px;break-inside:avoid} h2{margin:0;font-size:18px} p{margin:2px 0 6px;font-size:12px;color:#444}
      table{width:100%;border-collapse:collapse;font-size:14px} td{border-top:1px solid #ddd;padding:3px} .s{width:28px;font-weight:bold} .c{text-align:right}
    </style>${printHeader(title, `테이블 평균 차이 ${won(result.averageSpread)} · 전체 평균 ${won(result.overallAverage)}`)}<div class="grid">${cards}</div>${PRINT_FOOTER}${PRINT_ON_LOAD}`);
    w.document.close();
  }

  return (
    <div className="grid gap-4 text-white">
      <section className="grid gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-3 sm:p-4">
        <h2 className="text-lg font-black">1. 진출자 명단</h2>
        <p className="text-xs text-zinc-400">
          한 줄에 한 명: <b className="text-zinc-200">이름 칩수</b> (예: 홍길동 125,000). 엑셀에서 이름·칩 두 칸을 복사해 붙여넣거나 CSV 파일을 올려도 됩니다.
        </p>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          className="rounded-lg border border-white/20 bg-black p-2 font-mono text-sm"
          placeholder={"홍길동 125,000\n김철수 98,000\n이영희 210,500"}
        />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className="min-h-10 rounded-lg border border-white/25 px-3 font-bold hover:bg-white/10">
            CSV 파일 올리기
          </button>
          <span className="text-zinc-400">
            읽은 인원 <b className="text-white">{parsed.players.length}</b>명 · 칩 합계 <b className="text-white">{won(parsed.players.reduce((s, p) => s + p.chips, 0))}</b>
          </span>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-white/15 bg-zinc-950 p-3 sm:p-4">
        <h2 className="text-lg font-black">2. 테이블 설정</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["테이블 수", tableCount, setTableCount],
            ["테이블당 좌석", seats, setSeats],
            ["시작 테이블 번호", firstTable, setFirstTable],
          ].map(([label, value, set]) => (
            <label key={label as string} className="grid gap-1 text-sm font-bold">
              {label as string}
              <input
                inputMode="numeric"
                value={value as string}
                onChange={(event) => (set as (v: string) => void)(event.target.value.replace(/[^\d]/g, ""))}
                className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base"
              />
            </label>
          ))}
          <label className="col-span-2 grid gap-1 text-sm font-bold sm:col-span-1">
            제목
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-lg border border-white/20 bg-black px-2 text-base" />
          </label>
        </div>
        <button type="button" onClick={run} className="min-h-12 rounded-xl bg-amber-400 text-base font-black text-black hover:bg-amber-300">
          {result ? "다시 뽑기" : "배정하기"}
        </button>
        {notes.length ? (
          <ul className="grid gap-1 rounded-lg bg-rose-950/60 p-2 text-xs font-semibold text-rose-200">
            {notes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {result ? (
        <section className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-sm">
            <span>
              전체 평균 <b>{won(result.overallAverage)}</b>
            </span>
            <span>
              · 테이블 평균 차이 <b className="text-emerald-300">{won(result.averageSpread)}</b>
            </span>
            <span>
              · 합계 차이 <b>{won(result.totalSpread)}</b>
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(drawResultText(result, title)).catch(() => undefined);
                  setCopied(true);
                }}
                className="min-h-10 rounded-lg bg-[#FEE500] px-3 font-black text-black"
              >
                {copied ? "복사됨 ✓" : "단톡방용 복사"}
              </button>
              <button type="button" onClick={() => void downloadImage(result, title)} className="min-h-10 rounded-lg border border-white/25 px-3 font-bold">
                이미지 저장
              </button>
              <button type="button" onClick={print} className="min-h-10 rounded-lg border border-white/25 px-3 font-bold">
                인쇄 · PDF
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.tables.map((table) => {
              const diff = table.average - result.overallAverage;
              return (
                <article key={table.table} className="rounded-2xl border border-white/15 bg-black p-3">
                  <header className="flex items-baseline justify-between gap-2">
                    <h3 className="text-xl font-black text-emerald-300">{table.table}번 테이블</h3>
                    <span className="text-xs text-zinc-400">{table.players.length}명</span>
                  </header>
                  <p className="mt-1 text-xs text-zinc-300">
                    합계 <b className="text-white">{won(table.total)}</b> · 평균 <b className="text-white">{won(table.average)}</b>{" "}
                    <span className={cn(diff >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      ({diff >= 0 ? "+" : ""}
                      {won(diff)})
                    </span>
                  </p>
                  <ol className="mt-2 divide-y divide-white/10">
                    {table.players.map((player) => (
                      <li key={`${player.seat}-${player.name}`} className="flex items-center gap-2 py-1.5 text-sm">
                        <span className="grid size-7 place-items-center rounded-md bg-amber-400 text-xs font-black text-black">{player.seat}</span>
                        <span className="min-w-0 flex-1 truncate font-bold">{player.name}</span>
                        <span className="tabular-nums text-zinc-300">{won(player.chips)}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
