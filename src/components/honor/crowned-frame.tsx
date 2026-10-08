"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";

const CrownContext = createContext<ReadonlySet<string>>(new Set());

export function CrownProvider({ children }: { children: ReactNode }) {
  const [names, setNames] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ranking/crowns")
      .then((response) => response.json())
      .then((payload: { nicknames?: string[] }) => {
        if (!cancelled) setNames(new Set(payload.nicknames ?? []));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return <CrownContext.Provider value={names}>{children}</CrownContext.Provider>;
}

export function CrownedFrame({
  nickname,
  aura = "",
  children,
}: {
  nickname: string;
  aura?: string;
  children: ReactNode;
}) {
  const names = useContext(CrownContext);
  return <span className={cn("honor-mark", aura, names.has(nickname) && "rank-crown")}>{children}</span>;
}
