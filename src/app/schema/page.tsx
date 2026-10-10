import type { Metadata } from "next";
import { replaceTo } from "@/lib/history-redirect";

export const metadata: Metadata = { title: "데이터 구조", robots: { index: false } };

export default function SchemaGonePage() {
  replaceTo("/");
}
