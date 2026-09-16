import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** 在事务内取下一单号，如 SO-20260001 */
export async function nextDocNo(
  tx: Prisma.TransactionClient | typeof prisma,
  prefix: string,
) {
  const year = new Date().getFullYear();
  const key = `${prefix}${year}`;
  const row = await tx.numberSeq.upsert({
    where: { prefix: key },
    create: { prefix: key, next: 1 },
    update: { next: { increment: 1 } },
  });
  return `${prefix}-${year}${String(row.next).padStart(4, "0")}`;
}
