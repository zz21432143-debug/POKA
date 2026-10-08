"use server";

import { clearSession } from "@/lib/current-user";
import { replaceTo } from "@/lib/history-redirect";

export async function logoutAction() {
  await clearSession();
  replaceTo("/");
}
