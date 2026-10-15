import type { Metadata } from "next";
import { OmokCodeEntry } from "@/components/games/omok-create";

export const metadata: Metadata = {
  title: "요괴 오목 · 코드로 입장",
  robots: { index: false, follow: false },
};

/** 방 코드로 입장(친구에게 코드를 받은 사람 · 누구나) */
export default function OmokJoinPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-12">
      <header className="arcade-panel grid justify-items-center gap-2 px-4 py-6 text-center">
        <p className="arcade-px neon-gold text-xl">YOKAI OMOK</p>
        <h1 className="arcade-kr text-2xl text-white">코드로 입장</h1>
        <p className="text-base text-[#d6cdee]">
          친구에게 받은 5글자 방 코드를 넣어 주세요.
        </p>
      </header>
      <section className="arcade-panel p-4">
        <OmokCodeEntry />
      </section>
    </div>
  );
}
