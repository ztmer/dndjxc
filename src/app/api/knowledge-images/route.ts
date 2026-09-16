import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { saveKnowledgeJpeg } from "@/lib/knowledge-image-store";

export const runtime = "nodejs";

const MAX = 2.5 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请重新登录" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择图片" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "图片太大" }, { status: 400 });
  const type = file.type || "";
  if (type && !type.startsWith("image/")) return NextResponse.json({ error: "只接受图片" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < 32) return NextResponse.json({ error: "图片无效" }, { status: 400 });
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8;
  if (!jpeg) return NextResponse.json({ error: "请存成照片（JPEG）后再传" }, { status: 400 });
  const saved = await saveKnowledgeJpeg(buf);
  return NextResponse.json(saved);
}
