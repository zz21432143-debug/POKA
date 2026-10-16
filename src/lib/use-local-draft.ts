"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 글쓰기 임시 저장(휴대폰 · 컴퓨터 안에만 · 서버 비용 없음): 쓰다 나가도 다음에 들어오면 그대로.
 * key가 null이면(수정 화면 등) 저장하지 않음. 등록이 끝나면 clear()를 부르세요.
 */
export function useLocalDraft(key: string | null, fields: Record<string, string>, apply: (draft: Record<string, string>) => void) {
  const [restored, setRestored] = useState(false);
  const loaded = useRef(false);
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });
  useEffect(() => {
    if (!key || loaded.current) return;
    loaded.current = true;
    try {
      const raw = localStorage.getItem(key);
      const d = raw ? (JSON.parse(raw) as Record<string, string>) : null;
      if (d && Object.values(d).some((v) => typeof v === "string" && v.trim())) {
        applyRef.current(d);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 임시 글은 브라우저에서만 읽을 수 있음
        setRestored(true);
      }
    } catch {
      /* 저장소를 못 쓰면 건너뜀 */
    }
  }, [key]);
  const snapshot = JSON.stringify(fields);
  useEffect(() => {
    if (!key || !loaded.current) return;
    const t = window.setTimeout(() => {
      try {
        const d = JSON.parse(snapshot) as Record<string, string>;
        if (Object.values(d).some((v) => v.trim())) localStorage.setItem(key, snapshot);
        else localStorage.removeItem(key);
      } catch {
        /* 무시 */
      }
    }, 600);
    return () => window.clearTimeout(t);
  }, [key, snapshot]);
  const clear = () => {
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch {
      /* 무시 */
    }
  };
  return { restored, clear, dismiss: () => setRestored(false) };
}
