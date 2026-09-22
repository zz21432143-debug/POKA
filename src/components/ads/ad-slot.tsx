import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { cn } from "@/lib/utils";

/** 예전 사이드바/인피드 자리. 지금은 A칸 잔여와 같이 구글 채움. */
export function AdSlot({
  placement,
  className,
}: {
  placement: "sidebar" | "infeed";
  className?: string;
}) {
  return (
    <div className={cn(placement === "infeed" ? "w-full" : undefined, className)}>
      <GoogleAdUnit slot={placement === "infeed" ? 2 : 1} />
    </div>
  );
}
