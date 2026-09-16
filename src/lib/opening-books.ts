import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export function parseBizDateInput(raw?: string) {
  const s = (raw || "").trim();
  if (!s) return new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error("开单日期不对，请用年-月-日");
  return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+08:00`);
}

export async function assertBooksOnlyAllowed(tx: Prisma.TransactionClient | typeof prisma, booksOnly: boolean) {
  if (!booksOnly) return;
  const row = await tx.shopBizSetting.findUnique({ where: { id: "default" } });
  if (!row?.openingMode) {
    throw new Error("期初开关已关，不能录旧单。请到系统设置 → 开单规则打开「期初录入」");
  }
}
