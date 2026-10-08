"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const id = window.setTimeout(() => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }, 800);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}
