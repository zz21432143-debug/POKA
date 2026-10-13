/** 지금 배포 번호(Vercel 커밋). 서버 · 화면이 같은 값으로 빌드돼, 다르면 화면이 예전 배포라는 뜻입니다. */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
