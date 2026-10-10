import type { Metadata } from "next";
import { replaceTo } from "@/lib/history-redirect";

export const metadata: Metadata = { title: "익명 게시판" };

export default function AnonymousBoardClosedPage() {
  replaceTo("/community");
}
