"use server";

import { redirect } from "next/navigation";
import { clearSession } from "@/lib/current-user";

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
