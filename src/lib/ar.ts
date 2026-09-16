import type { Prisma } from "@/generated/prisma/client";
import { d } from "@/lib/money";
import { nextDocNo } from "@/lib/numbering";
import { addTimeline } from "@/lib/timeline";

export async function createAr(
  tx: Prisma.TransactionClient,
  input: {
    customerId: string;
    sourceType: string;
    sourceId: string;
    sourceNo: string;
    bizDate: Date;
    settlement: string;
    materialAmt: Prisma.Decimal | string | number;
    serviceAmt: Prisma.Decimal | string | number;
  },
) {
  const materialAmt = d(input.materialAmt);
  const serviceAmt = d(input.serviceAmt);
  const totalAmt = materialAmt.add(serviceAmt);
  if (totalAmt.lessThanOrEqualTo(0)) return null;
  return tx.arEntry.create({
    data: {
      customerId: input.customerId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceNo: input.sourceNo,
      bizDate: input.bizDate,
      settlement: input.settlement,
      materialAmt,
      serviceAmt,
      totalAmt,
    },
  });
}

export async function voidAr(tx: Prisma.TransactionClient, sourceType: string, sourceId: string) {
  const rows = await tx.arEntry.findMany({ where: { sourceType, sourceId, voided: false } });
  for (const row of rows) {
    if (d(row.receivedAmt).greaterThan(0)) {
      throw new Error(`${row.sourceNo} 已有收款，不能直接作废，请先处理收款/对账`);
    }
    if (row.statementId) {
      const st = await tx.statement.findUnique({ where: { id: row.statementId } });
      if (st && st.status === "confirmed") {
        throw new Error(`${row.sourceNo} 已进入已确认对账单，禁止直接冲销`);
      }
    }
    await tx.arEntry.update({ where: { id: row.id }, data: { voided: true } });
  }
}

export async function adjustAr(
  tx: Prisma.TransactionClient,
  sourceType: string,
  sourceId: string,
  deltaMaterial: Prisma.Decimal | string | number,
  deltaService: Prisma.Decimal | string | number,
) {
  const row = await tx.arEntry.findFirst({ where: { sourceType, sourceId, voided: false } });
  if (!row) return;
  if (row.statementId) {
    const st = await tx.statement.findUnique({ where: { id: row.statementId } });
    if (st?.status === "confirmed") throw new Error("已对账，禁止退货退料，请先处理对账单");
  }
  const materialAmt = d(row.materialAmt).add(d(deltaMaterial));
  const serviceAmt = d(row.serviceAmt).add(d(deltaService));
  const totalAmt = materialAmt.add(serviceAmt);
  if (totalAmt.lessThan(0)) throw new Error("退货后应收不能为负");
  let receivedAmt = d(row.receivedAmt);
  if (receivedAmt.greaterThan(totalAmt)) {
    const refund = receivedAmt.sub(totalAmt);
    receivedAmt = totalAmt;
    const rc = await tx.receipt.create({
      data: {
        docNo: await nextDocNo(tx, "RC"),
        customerId: row.customerId,
        method: "cash",
        remark: `退货退款 ${row.sourceNo}`,
        amount: refund.neg(),
        status: "submitted",
        submittedAt: new Date(),
        lines: { create: [{ arEntryId: row.id, amount: refund.neg() }] },
      },
    });
    await addTimeline(tx, {
      customerId: row.customerId,
      eventType: "收款",
      refType: "receipt",
      refId: rc.id,
      refNo: rc.docNo,
      summary: `退货退款 ${rc.docNo}`,
      amount: refund.neg(),
    });
  }
  await tx.arEntry.update({
    where: { id: row.id },
    data: { materialAmt, serviceAmt, totalAmt, receivedAmt },
  });
}
