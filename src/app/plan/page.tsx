import type { Metadata } from "next";
import { replaceTo } from "@/lib/history-redirect";

export const metadata: Metadata = { title: "운영 계획", robots: { index: false } };

export default function PlanGonePage() {
  replaceTo("/about");
}
