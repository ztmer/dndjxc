"use server";

import { assertLoggedIn } from "@/lib/require-session";

import { prisma } from "@/lib/prisma";
import { d } from "@/lib/money";
import { nextDocNo } from "@/lib/numbering";
import { applyStock, parseSerials, returnSerials, assertTrackedSerialCount, assertReturnSerialsMatch, restoreOutboundSerials } from "@/lib/stock";
import { adjustAr } from "@/lib/ar";
import { addTimeline } from "@/lib/timeline";
import { assertDraft, assertSubmitted, REOPEN_DRAFT } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { outboundSnForced } from "@/lib/shop-biz";

export async function saveSalesReturnDraft(input: {
  id?: string;
  salesOrderId: string;
  remark?: string;
  lines: { salesOrderLineId: string; qty: string; serials?: string }[];
}) {
  await assertLoggedIn();

  try {
    const id = await prisma.$transaction(async (tx) => {
      const so = await tx.salesOrder.findUnique({
        where: { id: input.salesOrderId },
        include: { lines: true },
      });
      if (!so || so.status !== "submitted") throw new Error("只能对已完成销售单退货");
      const lineData = [];
      let total = d(0);
      for (const line of input.lines) {
        const src = so.lines.find((l) => l.id === line.salesOrderLineId);
        if (!src) throw new Error("销售明细不存在");
        const qty = d(line.qty);
        if (qty.lessThanOrEqualTo(0)) continue;
        if (qty.add(src.returnedQty).greaterThan(src.qty)) throw new Error("退货数量超过可退");
        const amount = src.price.mul(qty);
        total = total.add(amount);
        const sns = parseSerials(line.serials);
        await assertTrackedSerialCount(tx, src.productId, qty, sns, "退货", { force: await outboundSnForced(tx) });
        if (sns.length) {
          await assertReturnSerialsMatch(tx, {
            sns,
            productId: src.productId,
            saleDocNo: so.docNo,
            expectStatus: ["sold", "installed"],
          });
        }
        lineData.push({
          salesOrderLineId: src.id,
          productId: src.productId,
          qty,
          amount,
          serialsJson: JSON.stringify(sns),
        });
      }
      if (!lineData.length) throw new Error("请填写退货明细");
      if (input.id) {
        const doc = await tx.salesReturn.findUnique({ where: { id: input.id } });
        if (!doc) throw new Error("单据不存在");
        assertDraft(doc.status);
        await tx.salesReturnLine.deleteMany({ where: { headerId: doc.id } });
        await tx.salesReturn.update({
          where: { id: doc.id },
          data: { remark: input.remark ?? "", totalAmt: total, lines: { create: lineData } },
        });
        return doc.id;
      }
      const created = await tx.salesReturn.create({
        data: {
          docNo: await nextDocNo(tx, "SR"),
          customerId: so.customerId,
          salesOrderId: so.id,
          remark: input.remark ?? "",
          totalAmt: total,
          lines: { create: lineData },
        },
      });
      return created.id;
    });
    revalidatePath("/sales-returns");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function submitSalesReturn(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.salesReturn.findUnique({
        where: { id },
        include: { lines: { include: { salesOrderLine: true } }, salesOrder: true },
      });
      if (!doc) throw new Error("单据不存在");
      assertDraft(doc.status);
      let mat = d(0);
      let svc = d(0);
      for (const line of doc.lines) {
        const src = line.salesOrderLine;
        if (d(src.returnedQty).add(line.qty).greaterThan(src.qty)) throw new Error("退货数量超过可退");
        await tx.salesOrderLine.update({
          where: { id: src.id },
          data: { returnedQty: d(src.returnedQty).add(line.qty) },
        });
        if (src.isStocked && !doc.salesOrder.booksOnly) {
          const sns = parseSerials(line.serialsJson);
          await assertTrackedSerialCount(tx, line.productId, line.qty, sns, "退货", { force: await outboundSnForced(tx) });
          if (sns.length) {
            await assertReturnSerialsMatch(tx, {
              sns,
              productId: line.productId,
              saleDocNo: doc.salesOrder.docNo,
              expectStatus: ["sold", "installed"],
            });
          }
          await applyStock(tx, {
            productId: line.productId,
            qtyDelta: line.qty,
            refType: "salesReturn",
            refId: doc.id,
            refNo: doc.docNo,
          });
          await returnSerials(tx, sns);
          mat = mat.add(line.amount);
        } else {
          svc = svc.add(line.amount);
        }
      }
      await adjustAr(tx, "salesOrder", doc.salesOrderId, mat.neg(), svc.neg());
      await addTimeline(tx, {
        customerId: doc.customerId,
        eventType: "销售退货",
        refType: "salesReturn",
        refId: doc.id,
        refNo: doc.docNo,
        summary: `销售退货 ${doc.docNo}`,
        amount: d(doc.totalAmt).neg(),
      });
      await tx.salesReturn.update({
        where: { id },
        data: { status: "submitted", submittedAt: new Date() },
      });
    });
    revalidatePath("/sales-returns");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "确认失败" };
  }
}

export async function voidSalesReturn(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.salesReturn.findUnique({
        where: { id },
        include: { lines: { include: { salesOrderLine: true } }, salesOrder: true },
      });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      let mat = d(0);
      let svc = d(0);
      for (const line of doc.lines) {
        const src = line.salesOrderLine;
        await tx.salesOrderLine.update({
          where: { id: src.id },
          data: { returnedQty: d(src.returnedQty).sub(line.qty) },
        });
        if (src.isStocked && !doc.salesOrder.booksOnly) {
          await applyStock(tx, {
            productId: line.productId,
            qtyDelta: d(line.qty).neg(),
            refType: "salesReturnVoid",
            refId: doc.id,
            refNo: doc.docNo,
          });
          await restoreOutboundSerials(tx, {
            sns: parseSerials(line.serialsJson),
            status: "sold",
            customerId: doc.salesOrder.customerId,
            saleDocNo: doc.salesOrder.docNo,
          });
          mat = mat.add(line.amount);
        } else svc = svc.add(line.amount);
      }
      await adjustAr(tx, "salesOrder", doc.salesOrderId, mat, svc);
      await tx.salesReturn.update({ where: { id }, data: { status: "voided", voidedAt: new Date() } });
    });
    revalidatePath("/sales-returns");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "作废失败" };
  }
}

export async function unsubmitSalesReturn(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.salesReturn.findUnique({
        where: { id },
        include: { lines: { include: { salesOrderLine: true } }, salesOrder: true },
      });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      let mat = d(0);
      let svc = d(0);
      for (const line of doc.lines) {
        const src = line.salesOrderLine;
        await tx.salesOrderLine.update({
          where: { id: src.id },
          data: { returnedQty: d(src.returnedQty).sub(line.qty) },
        });
        if (src.isStocked && !doc.salesOrder.booksOnly) {
          await applyStock(tx, {
            productId: line.productId,
            qtyDelta: d(line.qty).neg(),
            refType: "salesReturnVoid",
            refId: doc.id,
            refNo: doc.docNo,
          });
          await restoreOutboundSerials(tx, {
            sns: parseSerials(line.serialsJson),
            status: "sold",
            customerId: doc.salesOrder.customerId,
            saleDocNo: doc.salesOrder.docNo,
          });
          mat = mat.add(line.amount);
        } else svc = svc.add(line.amount);
      }
      await adjustAr(tx, "salesOrder", doc.salesOrderId, mat, svc);
      await tx.salesReturn.update({ where: { id }, data: REOPEN_DRAFT });
    });
    revalidatePath("/sales-returns");
    revalidatePath("/stock");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}
