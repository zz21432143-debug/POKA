import { NextResponse } from "next/server";
import { getCrownNicknames } from "@/lib/ranking";

export async function GET() {
  const nicknames = await getCrownNicknames().catch(() => []);
  return NextResponse.json({ nicknames });
}
