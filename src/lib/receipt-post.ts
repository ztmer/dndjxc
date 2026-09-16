import type { Prisma } from "@/generated/prisma/client";
import { d } from "@/lib/money";
import { nextDocNo } from "@/lib/numbering";
import { addTimeline } from "@/lib/timeline";

/** 当场收款：生成已完成收款单并核销应收（店里一两个人，不再单独审核收款）。 */
export async function postReceiptInTx(
  tx: Prisma.TransactionClient,
  input: {
    customerId: string;
    method: string;
    remark?: string;
    lines: { arEntryId: string; amount: Prisma.Decimal | string | number }[];
  },
) {
  const lineData = input.lines
    .filter((l) => l.arEntryId && d(l.amount).greaterThan(0))
    .map((l) => ({ arEntryId: l.arEntryId, amount: d(l.amount) }));
  if (!lineData.length) throw new Error("请选择核销应收");
  const amount = lineData.reduce((s, l) => s.add(l.amount), d(0));
  const created = await tx.receipt.create({
    data: {
      docNo: await nextDocNo(tx, "RC"),
      customerId: input.customerId,
      method: input.method,
      remark: input.remark ?? "",
      amount,
      status: "submitted",
      submittedAt: new Date(),
      lines: { create: lineData },
    },
  });
  for (const line of lineData) {
    const ar = await tx.arEntry.findUnique({ where: { id: line.arEntryId } });
    if (!ar || ar.voided) throw new Error("应收不存在");
    if (ar.customerId !== input.customerId) throw new Error("不能核销其他客户的应收");
    const next = d(ar.receivedAmt).add(line.amount);
    if (next.greaterThan(ar.totalAmt)) throw new Error(`${ar.sourceNo} 核销超过未收`);
    await tx.arEntry.update({ where: { id: ar.id }, data: { receivedAmt: next } });
    if (ar.statementId) {
      const st = await tx.statement.findUnique({ where: { id: ar.statementId } });
      if (st) {
        await tx.statement.update({
          where: { id: st.id },
          data: { receivedAmt: d(st.receivedAmt).add(line.amount) },
        });
      }
    }
  }
  await addTimeline(tx, {
    customerId: input.customerId,
    eventType: "收款",
    refType: "receipt",
    refId: created.id,
    refNo: created.docNo,
    summary: `收款 ${created.docNo}`,
    amount,
  });
  return created;
}

/** 作废业务单前，冲掉只核销本单应收的收款。 */
export async function reverseReceiptsForSource(
  tx: Prisma.TransactionClient,
  sourceType: string,
  sourceId: string,
) {
  const ars = await tx.arEntry.findMany({ where: { sourceType, sourceId, voided: false } });
  for (const ar of ars) {
    const rlines = await tx.receiptLine.findMany({
      where: { arEntryId: ar.id },
      include: { header: true },
    });
    for (const rl of rlines) {
      const siblings = await tx.receiptLine.findMany({ where: { headerId: rl.headerId } });
      if (siblings.length > 1 && rl.header.status === "submitted") {
        throw new Error("本单收款与其它应收写在同一张收款单上，请先作废那张收款单");
      }
      if (rl.header.status === "submitted") {
        const fresh = await tx.arEntry.findUnique({ where: { id: ar.id } });
        if (fresh) {
          await tx.arEntry.update({
            where: { id: fresh.id },
            data: { receivedAmt: d(fresh.receivedAmt).sub(rl.amount) },
          });
          if (fresh.statementId) {
            const st = await tx.statement.findUnique({ where: { id: fresh.statementId } });
            if (st) {
              await tx.statement.update({
                where: { id: st.id },
                data: { receivedAmt: d(st.receivedAmt).sub(rl.amount) },
              });
            }
          }
        }
      }
      if (rl.header.status !== "voided") {
        await tx.receipt.update({
          where: { id: rl.headerId },
          data: { status: "voided", voidedAt: new Date() },
        });
      }
    }
  }
}
