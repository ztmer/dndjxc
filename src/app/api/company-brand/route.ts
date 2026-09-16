import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY_BRAND_KINDS, deleteCompanyBrand, saveCompanyBrand, type CompanyBrandKind } from "@/lib/company-brand-store";

export const runtime = "nodejs";

const MAX = 3 * 1024 * 1024;

function isKind(v: string): v is CompanyBrandKind {
  return (COMPANY_BRAND_KINDS as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请重新登录" }, { status: 401 });
  const form = await req.formData();
  const kindRaw = String(form.get("kind") || "");
  if (!isKind(kindRaw)) return NextResponse.json({ error: "请选择 logo 或公章" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "请选择图片" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "图片太大，请压缩后再传" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const saved = await saveCompanyBrand(kindRaw, buf);
    const field = kindRaw === "logo" ? "logoFile" : "sealFile";
    const name = (await prisma.company.findUnique({ where: { id: "default" } }))?.name || "电脑店";
    await prisma.company.upsert({
      where: { id: "default" },
      create: { id: "default", name, [field]: saved.fileName },
      update: { [field]: saved.fileName },
    });
    revalidatePath("/", "layout");
    revalidatePath("/login");
    return NextResponse.json({ ok: true, fileName: saved.fileName, url: `/api/company-brand/${kindRaw}` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "上传失败" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请重新登录" }, { status: 401 });
  const kindRaw = new URL(req.url).searchParams.get("kind") || "";
  if (!isKind(kindRaw)) return NextResponse.json({ error: "请选择 logo 或公章" }, { status: 400 });
  await deleteCompanyBrand(kindRaw);
  const field = kindRaw === "logo" ? "logoFile" : "sealFile";
  await prisma.company.updateMany({ where: { id: "default" }, data: { [field]: "" } });
  revalidatePath("/", "layout");
  revalidatePath("/login");
  return NextResponse.json({ ok: true });
}
