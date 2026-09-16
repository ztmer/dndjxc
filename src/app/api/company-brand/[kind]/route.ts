import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY_BRAND_KINDS, readCompanyBrandFile, type CompanyBrandKind } from "@/lib/company-brand-store";

export const runtime = "nodejs";

function isKind(v: string): v is CompanyBrandKind {
  return (COMPANY_BRAND_KINDS as readonly string[]).includes(v);
}

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isKind(kind)) return NextResponse.json({ error: "不存在" }, { status: 404 });
  if (kind !== "logo") {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "请重新登录" }, { status: 401 });
  }
  const company = await prisma.company.findUnique({ where: { id: "default" } });
  const fileName = kind === "logo" ? company?.logoFile : company?.sealFile;
  const file = await readCompanyBrandFile(fileName || "");
  if (!file) return NextResponse.json({ error: "尚未上传" }, { status: 404 });
  return new NextResponse(new Uint8Array(file.buf), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, max-age=60",
    },
  });
}
