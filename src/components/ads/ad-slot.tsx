import { GoogleAdUnit } from "@/components/ads/google-ad-unit";
import { cn } from "@/lib/utils";

export function AdSlot({
  placement,
  className,
}: {
  placement: "sidebar" | "infeed" | "post-top" | "post-bottom";
  className?: string;
}) {
  const mapped = placement === "infeed" || placement === "sidebar" ? "sidebar" : placement;
  return (
    <div className={cn(className)}>
      <GoogleAdUnit placement={mapped} />
    </div>
  );
}
