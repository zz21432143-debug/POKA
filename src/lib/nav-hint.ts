"use client";

import { useEffect, useSyncExternalStore } from "react";

/** 주소만으로 메뉴 묶음을 모를 때(게시글 등) 화면이 알려 주는 묶음 이름 */
let current: string | null = null;
const listeners = new Set<() => void>();

export function setNavHint(value: string | null) {
  current = value;
  for (const l of listeners) l();
}

export function useNavHint() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}

/** 게시글 화면에 두면 그 게시판 묶음에 메뉴 불이 들어옵니다 */
export function NavHint({ section }: { section: string | null }) {
  useEffect(() => {
    setNavHint(section);
    return () => setNavHint(null);
  }, [section]);
  return null;
}
