import type { Metadata } from "next";
import { replaceTo } from "@/lib/history-redirect";

export const metadata: Metadata = { title: "알림", robots: { index: false } };

export default function NotificationsGonePage() {
  replaceTo("/");
}
