import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getSessionUser } from "@/lib/auth";
import { backupDir, safeBackupName } from "@/lib/db-backup";

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "owner") return NextResponse.json({ error: "无权下载" }, { status: 403 });
  const { name } = await ctx.params;
  const safe = safeBackupName(decodeURIComponent(name));
  if (!safe) return NextResponse.json({ error: "文件名无效" }, { status: 400 });
  try {
    const buf = await readFile(path.join(backupDir(), safe));
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safe}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "没有这个备份" }, { status: 404 });
  }
}
