import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getMarkCatalog } from "@/lib/marks";

export async function GET() {
  const user = await getCurrentUser();
  const catalog = await getMarkCatalog(user?.id);
  return NextResponse.json(catalog);
}
