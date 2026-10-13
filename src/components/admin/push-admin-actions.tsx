"use client";

import { useState } from "react";
import { BellRingIcon, Loader2Icon, SendIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

type Region = { region: string; reach: number };

/** 알림 관리: 내 기기 테스트 알림 · 공지 알림 보내기 */
export function PushAdminActions({ enabled, mine, total, regions }: { enabled: boolean; mine: number; total: number; regions: Region[] }) {
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [region, setRegion] = useState("");
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const reach = region ? (regions.find((row) => row.region === region)?.reach ?? 0) : total;

  async function call(payload: Record<string, unknown>) {
    const res = await fetch("/api/admin/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = (await res.json().catch(() => ({}))) as { error?: string; sent?: number; total?: number };
    if (!res.ok) throw new Error(data.error ?? "보내지 못했습니다.");
    return data;
  }

  async function test() {
    setBusy("test");
    setTestMsg(null);
    try {
      const data = await call({ action: "test" });
      setTestMsg(`내 기기 ${data.total}대 중 ${data.sent}대로 보냈어요. 휴대폰을 확인해 보세요.`);
    } catch (e) {
      setTestMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!window.confirm(`${region || "전체"} ${reach.toLocaleString()}대에 알림을 보낼까요? 보내면 취소할 수 없어요.`)) return;
    setBusy("send");
    setSendMsg(null);
    try {
      const data = await call({ action: "broadcast", title, body, url, region: region || undefined });
      setSendMsg(`${data.total}대 중 ${data.sent}대로 보냈어요.`);
      setTitle("");
      setBody("");
    } catch (e) {
      setSendMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section aria-label="테스트 알림" className="grid content-start gap-2 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <h2 className="text-lg font-semibold">내 휴대폰으로 테스트</h2>
        <p className="text-sm text-muted-foreground">
          이 계정으로 알림을 켠 기기 <b className="text-foreground">{mine}대</b>. 휴대폰 POKA 앱에서 로그인한 뒤 급구 알림을 켜 두면 여기서 확인할 수 있어요.
        </p>
        <button
          type="button"
          data-push-test
          disabled={!enabled || busy !== null}
          onClick={() => void test()}
          className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl border border-[#c9a25c]/60 px-4 text-sm font-bold text-[#e7c98a] hover:bg-[#c9a25c]/10 disabled:opacity-50"
        >
          {busy === "test" ? <Loader2Icon className="size-4 animate-spin" /> : <BellRingIcon className="size-4" />}
          테스트 알림 보내기
        </button>
        {testMsg ? <p data-push-test-msg className="text-sm font-semibold">{testMsg}</p> : null}
      </section>

      <section aria-label="공지 알림 보내기" className="grid content-start gap-2 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <h2 className="text-lg font-semibold">공지 알림 보내기</h2>
        <p className="text-xs text-muted-foreground">새 기능·큰 대회 소식처럼 꼭 필요할 때만 보내 주세요. 자주 보내면 알림을 끄는 사람이 늘어요.</p>
        <select aria-label="받을 지역" value={region} onChange={(e) => setRegion(e.target.value)} className="h-11 rounded-xl border border-border bg-background px-2 text-sm font-semibold">
          <option value="">전체 ({total.toLocaleString()}대)</option>
          {regions.map((row) => (
            <option key={row.region} value={row.region}>
              {row.region} + 전국 ({row.reach.toLocaleString()}대)
            </option>
          ))}
        </select>
        <Input aria-label="알림 제목" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="제목 (예: 게임 현황판 오픈)" className="h-11" />
        <Input aria-label="알림 내용" value={body} maxLength={140} onChange={(e) => setBody(e.target.value)} placeholder="내용 (140자까지)" className="h-11" />
        <Input aria-label="누르면 열 주소" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/notices" className="h-11" />
        <button
          type="button"
          data-push-send
          disabled={!enabled || busy !== null || title.trim().length < 2 || body.trim().length < 2 || reach === 0}
          onClick={() => void send()}
          className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl bg-[#8b2222] px-4 text-sm font-bold text-white hover:bg-[#a12a2a] disabled:opacity-50"
        >
          {busy === "send" ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
          {reach.toLocaleString()}대에 보내기
        </button>
        {sendMsg ? <p data-push-send-msg className="text-sm font-semibold">{sendMsg}</p> : null}
      </section>
    </div>
  );
}
