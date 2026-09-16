import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listLocalPrivateCidrs, scanPrivateLan } from "@/lib/lan-scan";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请重新登录" }, { status: 401 });
  return NextResponse.json({ cidrs: listLocalPrivateCidrs() });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请重新登录" }, { status: 401 });
  let cidr = "";
  try {
    const body = (await req.json()) as { cidr?: string };
    cidr = (body.cidr ?? "").trim();
  } catch {
    cidr = "";
  }
  const r = await scanPrivateLan(cidr || undefined);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(r);
}
