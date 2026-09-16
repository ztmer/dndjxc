"use server";

import { assertLoggedIn } from "@/lib/require-session";

import { prisma } from "@/lib/prisma";
import { d } from "@/lib/money";
import { nextDocNo } from "@/lib/numbering";
import { applyStock, inboundSerials, outboundSerials, parseSerials, assertTrackedSerialCount, voidInboundSerials, restockSerials } from "@/lib/stock";
import { addMonths, assertDraft, assertSubmitted, REOPEN_DRAFT } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { outboundSnForced } from "@/lib/shop-biz";

export async function savePurchaseReceiptDraft(input: {
  id?: string;
  supplierId?: string;
  remark?: string;
  lines: {
    productId: string;
    qty: string;
    cost: string;
    serials?: string;
    purchaseRequestLineId?: string;
    purchaseWarrantyMonths?: number;
  }[];
}) {
  await assertLoggedIn();

  try {
    const id = await prisma.$transaction(async (tx) => {
      const lineData = [];
      for (const l of input.lines) {
        if (!l.productId || d(l.qty).lessThanOrEqualTo(0)) continue;
        const product = await tx.product.findUnique({ where: { id: l.productId } });
        lineData.push({
          productId: l.productId,
          qty: d(l.qty),
          cost: d(l.cost),
          serialsJson: JSON.stringify(parseSerials(l.serials)),
          purchaseRequestLineId: l.purchaseRequestLineId || null,
          purchaseWarrantyMonths: l.purchaseWarrantyMonths ?? product?.purchaseWarrantyMonths ?? 12,
        });
      }
      if (!lineData.length) throw new Error("请填写入库明细");
      if (input.id) {
        const doc = await tx.purchaseReceipt.findUnique({ where: { id: input.id } });
        if (!doc) throw new Error("单据不存在");
        assertDraft(doc.status);
        await tx.purchaseReceiptLine.deleteMany({ where: { headerId: doc.id } });
        await tx.purchaseReceipt.update({
          where: { id: doc.id },
          data: {
            supplierId: input.supplierId || null,
            remark: input.remark ?? "",
            lines: { create: lineData },
          },
        });
        return doc.id;
      }
      const created = await tx.purchaseReceipt.create({
        data: {
          docNo: await nextDocNo(tx, "PO"),
          supplierId: input.supplierId || null,
          remark: input.remark ?? "",
          lines: { create: lineData },
        },
      });
      return created.id;
    });
    revalidatePath("/purchase");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function submitPurchaseReceipt(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.purchaseReceipt.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertDraft(doc.status);
      for (const line of doc.lines) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product) throw new Error("商品不存在");
        const sns = parseSerials(line.serialsJson);
        await assertTrackedSerialCount(tx, line.productId, line.qty, sns, "入库");
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: line.qty,
          refType: "purchaseReceipt",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await inboundSerials(tx, {
          productId: line.productId,
          sns,
          supplierId: doc.supplierId,
          purchaseWarranty: addMonths(doc.bizDate, line.purchaseWarrantyMonths),
          purchaseDocNo: doc.docNo,
        });
        await tx.product.update({ where: { id: product.id }, data: { lastCost: line.cost } });
        if (line.purchaseRequestLineId) {
          const prl = await tx.purchaseRequestLine.findUnique({
            where: { id: line.purchaseRequestLineId },
            include: { header: true },
          });
          if (prl) {
            const filled = d(prl.filledQty).add(line.qty);
            await tx.purchaseRequestLine.update({
              where: { id: prl.id },
              data: { filledQty: filled },
            });
            const all = await tx.purchaseRequestLine.findMany({ where: { headerId: prl.headerId } });
            if (all.every((x) => d(x.filledQty).greaterThanOrEqualTo(x.qty))) {
              await tx.purchaseRequest.update({ where: { id: prl.headerId }, data: { status: "filled" } });
            }
          }
        }
      }
      await tx.purchaseReceipt.update({
        where: { id },
        data: { status: "submitted", submittedAt: new Date() },
      });
    });
    revalidatePath("/purchase");
    revalidatePath("/purchase-requests");
    revalidatePath("/stock");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "确认失败" };
  }
}

export async function voidPurchaseReceipt(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.purchaseReceipt.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      for (const line of doc.lines) {
        const sns = parseSerials(line.serialsJson);
        await voidInboundSerials(tx, sns);
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: d(line.qty).neg(),
          refType: "purchaseReceiptVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
        if (line.purchaseRequestLineId) {
          const prl = await tx.purchaseRequestLine.findUnique({
            where: { id: line.purchaseRequestLineId },
            include: { header: true },
          });
          if (prl) {
            const nextFilled = d(prl.filledQty).sub(line.qty);
            await tx.purchaseRequestLine.update({
              where: { id: prl.id },
              data: { filledQty: nextFilled.lessThan(0) ? d(0) : nextFilled },
            });
            await tx.purchaseRequest.update({
              where: { id: prl.headerId },
              data: { status: "open" },
            });
          }
        }
      }
      await tx.purchaseReceipt.update({ where: { id }, data: { status: "voided", voidedAt: new Date() } });
    });
    revalidatePath("/purchase");
    revalidatePath("/purchase-requests");
    revalidatePath("/stock");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "作废失败" };
  }
}

export async function unsubmitPurchaseReceipt(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.purchaseReceipt.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      for (const line of doc.lines) {
        const sns = parseSerials(line.serialsJson);
        await voidInboundSerials(tx, sns);
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: d(line.qty).neg(),
          refType: "purchaseReceiptVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
        if (line.purchaseRequestLineId) {
          const prl = await tx.purchaseRequestLine.findUnique({
            where: { id: line.purchaseRequestLineId },
            include: { header: true },
          });
          if (prl) {
            const nextFilled = d(prl.filledQty).sub(line.qty);
            await tx.purchaseRequestLine.update({
              where: { id: prl.id },
              data: { filledQty: nextFilled.lessThan(0) ? d(0) : nextFilled },
            });
            await tx.purchaseRequest.update({
              where: { id: prl.headerId },
              data: { status: "open" },
            });
          }
        }
      }
      await tx.purchaseReceipt.update({ where: { id }, data: REOPEN_DRAFT });
    });
    revalidatePath("/purchase");
    revalidatePath("/purchase-requests");
    revalidatePath("/stock");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}

export async function saveOtherReceiptDraft(input: {
  id?: string;
  remark?: string;
  lines: { productId: string; qty: string; cost?: string; serials?: string }[];
}) {
  await assertLoggedIn();

  try {
    const id = await prisma.$transaction(async (tx) => {
      const lineData = input.lines
        .filter((l) => l.productId && d(l.qty).greaterThan(0))
        .map((l) => ({
          productId: l.productId,
          qty: d(l.qty),
          cost: d(l.cost ?? 0),
          serialsJson: JSON.stringify(parseSerials(l.serials)),
        }));
      if (!lineData.length) throw new Error("请填写明细");
      if (input.id) {
        const doc = await tx.otherReceipt.findUnique({ where: { id: input.id } });
        if (!doc) throw new Error("单据不存在");
        assertDraft(doc.status);
        await tx.otherReceiptLine.deleteMany({ where: { headerId: doc.id } });
        await tx.otherReceipt.update({
          where: { id: doc.id },
          data: { remark: input.remark ?? "", lines: { create: lineData } },
        });
        return doc.id;
      }
      const created = await tx.otherReceipt.create({
        data: {
          docNo: await nextDocNo(tx, "OI"),
          remark: input.remark ?? "",
          lines: { create: lineData },
        },
      });
      return created.id;
    });
    revalidatePath("/other-receipts");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function submitOtherReceipt(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.otherReceipt.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertDraft(doc.status);
      for (const line of doc.lines) {
        const sns = parseSerials(line.serialsJson);
        await assertTrackedSerialCount(tx, line.productId, line.qty, sns, "入库");
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: line.qty,
          refType: "otherReceipt",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await inboundSerials(tx, {
          productId: line.productId,
          sns,
          purchaseDocNo: doc.docNo,
        });
      }
      await tx.otherReceipt.update({
        where: { id },
        data: { status: "submitted", submittedAt: new Date() },
      });
    });
    revalidatePath("/other-receipts");
    revalidatePath("/stock");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "确认失败" };
  }
}

export async function voidOtherReceipt(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.otherReceipt.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      for (const line of doc.lines) {
        await voidInboundSerials(tx, parseSerials(line.serialsJson));
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: d(line.qty).neg(),
          refType: "otherReceiptVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
      }
      await tx.otherReceipt.update({ where: { id }, data: { status: "voided", voidedAt: new Date() } });
    });
    revalidatePath("/other-receipts");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "作废失败" };
  }
}

export async function unsubmitOtherReceipt(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.otherReceipt.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      for (const line of doc.lines) {
        await voidInboundSerials(tx, parseSerials(line.serialsJson));
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: d(line.qty).neg(),
          refType: "otherReceiptVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
      }
      await tx.otherReceipt.update({ where: { id }, data: REOPEN_DRAFT });
    });
    revalidatePath("/other-receipts");
    revalidatePath("/stock");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}

export async function saveOtherIssueDraft(input: {
  id?: string;
  reason: string;
  remark?: string;
  lines: { productId: string; qty: string; serials?: string }[];
}) {
  await assertLoggedIn();

  try {
    const id = await prisma.$transaction(async (tx) => {
      const lineData = input.lines
        .filter((l) => l.productId && d(l.qty).greaterThan(0))
        .map((l) => ({
          productId: l.productId,
          qty: d(l.qty),
          serialsJson: JSON.stringify(parseSerials(l.serials)),
        }));
      if (!lineData.length) throw new Error("请填写明细");
      if (input.id) {
        const doc = await tx.otherIssue.findUnique({ where: { id: input.id } });
        if (!doc) throw new Error("单据不存在");
        assertDraft(doc.status);
        await tx.otherIssueLine.deleteMany({ where: { headerId: doc.id } });
        await tx.otherIssue.update({
          where: { id: doc.id },
          data: { reason: input.reason, remark: input.remark ?? "", lines: { create: lineData } },
        });
        return doc.id;
      }
      const created = await tx.otherIssue.create({
        data: {
          docNo: await nextDocNo(tx, "OO"),
          reason: input.reason,
          remark: input.remark ?? "",
          lines: { create: lineData },
        },
      });
      return created.id;
    });
    revalidatePath("/other-issues");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function submitOtherIssue(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.otherIssue.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertDraft(doc.status);
      for (const line of doc.lines) {
        const sns = parseSerials(line.serialsJson);
        await assertTrackedSerialCount(tx, line.productId, line.qty, sns, "出库", { force: await outboundSnForced(tx) });
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: d(line.qty).neg(),
          refType: "otherIssue",
          refId: doc.id,
          refNo: doc.docNo,
          remark: doc.reason,
        });
        await outboundSerials(tx, {
          sns,
          status: "scrapped",
          saleDocNo: doc.docNo,
        });
      }
      await tx.otherIssue.update({
        where: { id },
        data: { status: "submitted", submittedAt: new Date() },
      });
    });
    revalidatePath("/other-issues");
    revalidatePath("/stock");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "确认失败" };
  }
}

export async function voidOtherIssue(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.otherIssue.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      for (const line of doc.lines) {
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: line.qty,
          refType: "otherIssueVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await restockSerials(tx, parseSerials(line.serialsJson));
      }
      await tx.otherIssue.update({ where: { id }, data: { status: "voided", voidedAt: new Date() } });
    });
    revalidatePath("/other-issues");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "作废失败" };
  }
}

export async function unsubmitOtherIssue(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.otherIssue.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      for (const line of doc.lines) {
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: line.qty,
          refType: "otherIssueVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await restockSerials(tx, parseSerials(line.serialsJson));
      }
      await tx.otherIssue.update({ where: { id }, data: REOPEN_DRAFT });
    });
    revalidatePath("/other-issues");
    revalidatePath("/stock");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}
