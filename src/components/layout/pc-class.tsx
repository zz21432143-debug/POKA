"use client";

import { useEffect } from "react";

function isPcViewport() {
  const hoverFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  return hoverFine || window.screen.width >= 1100 || window.innerWidth >= 900;
}

export function PcClass() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.classList.toggle("is-pc", isPcViewport());
    };
    apply();
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);
  return null;
}
