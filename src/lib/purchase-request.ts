import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { d } from "@/lib/money";
import { nextDocNo } from "@/lib/numbering";

export async function openPurchaseRequest(
  sourceType: string,
  sourceId: string,
  sourceNo: string,
  shortages: { productId: string; qty: string }[],
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.purchaseRequest.findFirst({
      where: { sourceType, sourceId, status: "open" },
      include: { lines: true },
    });
    if (existing) {
      await tx.purchaseRequestLine.deleteMany({ where: { headerId: existing.id } });
      await tx.purchaseRequest.update({
        where: { id: existing.id },
        data: {
          sourceNo,
          lines: { create: shortages.map((s) => ({ productId: s.productId, qty: d(s.qty) })) },
        },
      });
      return existing.docNo;
    }
    const docNo = await nextDocNo(tx, "PR");
    await tx.purchaseRequest.create({
      data: {
        docNo,
        sourceType,
        sourceId,
        sourceNo,
        status: "open",
        lines: { create: shortages.map((s) => ({ productId: s.productId, qty: d(s.qty) })) },
      },
    });
    return docNo;
  });
}
