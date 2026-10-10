import type { Metadata } from "next";
import { replaceTo } from "@/lib/history-redirect";

export const metadata: Metadata = { title: "POKA 소개" };

export default function IntroRedirectPage() {
  replaceTo("/");
}
