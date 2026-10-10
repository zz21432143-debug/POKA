import type { Metadata } from "next";
import { replaceTo } from "@/lib/history-redirect";

export const metadata: Metadata = { title: "운영 이슈" };

export default function IssuesGonePage() {
  replaceTo("/boards/free");
}
