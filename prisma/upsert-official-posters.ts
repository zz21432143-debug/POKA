import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const POSTERS = [
  {
    title: "강남 캐주얼 나이트",
    image: "/images/posters/official-1.svg",
    location: "강남",
    tag: "나이트",
    content: "매주 금·토 22:00 강남 캐주얼 나이트. 바이인 ₩200,000.",
    isPaid: true,
  },
  {
    title: "주말 딜러 오픈 데이",
    image: "/images/posters/official-2.svg",
    location: "홍대",
    tag: "제휴",
    content: "토·일 14:00 신입 딜러 오픈 데이. 현장 등록 가능.",
    isPaid: false,
  },
  {
    title: "핸드스터디 시즌2",
    image: "/images/posters/official-3.svg",
    location: "분당",
    tag: "교육",
    content: "수요일 20:30 스팟 분석 라이브 핸드스터디 시즌2.",
    isPaid: false,
  },
  {
    title: "룸 투어 위크",
    image: "/images/posters/official-4.svg",
    location: "송파",
    tag: "협찬",
    content: "5일간 4개 매장 오픈하우스. 현장 투어 예약.",
    isPaid: true,
  },
  {
    title: "출석 더블 EXP 제휴",
    image: "/images/posters/official-5.svg",
    location: "수원",
    tag: "제휴",
    content: "이번 주 출석 시 경험치 2배. POKA 제휴 이벤트.",
    isPaid: false,
  },
  {
    title: "클럽 멤버십 안내",
    image: "/images/posters/official-6.svg",
    location: "인천",
    tag: "멤버십",
    content: "연회비 가입 시 토너 시드 지급. 클럽 멤버십 안내.",
    isPaid: true,
  },
] as const;

async function main() {
  const dealer =
    (await prisma.user.findUnique({ where: { nickname: "펠트딜러" } })) ??
    (await prisma.user.findFirst({ where: { isDealerVerified: true } }));
  if (!dealer) throw new Error("시드 회원이 없습니다. prisma db seed 를 먼저 실행하세요.");

  const ids: string[] = [];
  for (const [index, poster] of POSTERS.entries()) {
    const existing = await prisma.post.findFirst({
      where: { boardType: "PROMO", title: poster.title },
    });
    const data = {
      boardType: "PROMO" as const,
      authorId: dealer.id,
      title: poster.title,
      content: poster.content,
      bannerImageUrl: poster.image,
      promoLocation: poster.location,
      promoTag: poster.tag,
      storeVerified: true,
      hidden: false,
      isPaid: poster.isPaid,
      createdAt: new Date(Date.now() - index * 60_000),
    };
    const post = existing
      ? await prisma.post.update({ where: { id: existing.id }, data })
      : await prisma.post.create({ data });
    ids.push(post.id);
  }

  await prisma.bannerSlot.deleteMany();
  await prisma.bannerSlot.createMany({
    data: ids.map((postId, index) => ({
      slot: index + 1,
      mode: "MANUAL",
      enabled: true,
      postId,
    })),
  });

  const rest = await prisma.post.findMany({
    where: { boardType: "PROMO", id: { notIn: ids } },
    orderBy: { createdAt: "desc" },
  });
  for (const [index, post] of rest.entries()) {
    await prisma.post.update({
      where: { id: post.id },
      data: {
        bannerImageUrl: `/images/posters/official-${(index % 6) + 1}.svg`,
        storeVerified: true,
        hidden: false,
      },
    });
  }

  console.log(`Official posters ready: ${ids.length} featured, ${rest.length} extra`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
