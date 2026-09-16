import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { KNOWLEDGE_IMAGE_ID, readKnowledgeJpeg } from "@/lib/knowledge-image-store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请重新登录" }, { status: 401 });
  const { id } = await params;
  if (!KNOWLEDGE_IMAGE_ID.test(id)) return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  const buf = await readKnowledgeJpeg(id);
  if (!buf) return NextResponse.json({ error: "图片不存在" }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
