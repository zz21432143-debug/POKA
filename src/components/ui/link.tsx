import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * 사이트 공용 링크: 「미리 받기」는 기본으로 끔.
 * 화면에 보이는 링크마다 서버가 그 화면을 미리 만들어(홈 한 번에 약 35번) 서버 사용량이 크게 늘어서,
 * 누를 때만 받음. 꼭 빨라야 하는 곳은 prefetch를 직접 켜서 씀.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
