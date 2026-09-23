"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyTextButton({ text, label = "문구 복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" className="h-9" onClick={copy}>
      {done ? "복사됨" : label}
    </Button>
  );
}
