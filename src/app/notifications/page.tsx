export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">알림</h1>
        <p className="mt-1 text-sm text-muted-foreground">내게 온 알림이 있으면 여기에 쌓입니다.</p>
      </header>
      <p className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted-foreground">
        새 알림이 없습니다. 사이트 활동은 상단 전광판에서 흐릅니다.
      </p>
    </div>
  );
}
