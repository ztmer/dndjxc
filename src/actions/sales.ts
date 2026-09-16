"use server";

import { assertLoggedIn } from "@/lib/require-session";

import { prisma } from "@/lib/prisma";
import { d } from "@/lib/money";
import { nextDocNo } from "@/lib/numbering";
import { applyStock, assertSellableQty, outboundSerials, parseSerials, restockSerials } from "@/lib/stock";
import { createAr, voidAr } from "@/lib/ar";
import { addTimeline } from "@/lib/timeline";
import { addMonths, assertDraft, assertSettlement, assertSubmitted, REOPEN_DRAFT } from "@/lib/guards";
import { openPurchaseRequest } from "@/lib/purchase-request";
import { postReceiptInTx, reverseReceiptsForSource } from "@/lib/receipt-post";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { notifyWecomSales } from "@/lib/wecom";
import { outboundSnForced } from "@/lib/shop-biz";
import { assertBooksOnlyAllowed, parseBizDateInput } from "@/lib/opening-books";

type LineInput = {
  productId: string;
  qty: string;
  price: string;
  serials?: string;
  isStocked?: boolean;
  saleWarrantyMonths?: number;
};

async function checkLinesStock(tx: Prisma.TransactionClient, lines: LineInput[], requireSerial: boolean) {
  const shortages: { productId: string; qty: string }[] = [];
  for (const line of lines) {
    const product = await tx.product.findUnique({ where: { id: line.productId } });
    if (!product) throw new Error("商品不存在");
    if (!product.isStocked) continue;
    try {
      await assertSellableQty(tx, line.productId, line.qty);
    } catch {
      shortages.push({ productId: line.productId, qty: line.qty });
    }
    if (requireSerial) {
      const sns = parseSerials(line.serials);
      if (!product.trackSerial) continue;
      const need = Number(d(line.qty).toNumber());
      const force = await outboundSnForced(tx);
      if (force && sns.length !== need) {
        throw new Error(`${product.name} 管唯一 SN，出库前须扫齐唯一码（缺货先出待采购，不用先扫）`);
      }
      if (!force && sns.length > need) {
        throw new Error(`${product.name} 已扫 ${sns.length} 个码，不能多于数量 ${need}`);
      }
    }
  }
  return shortages;
}

export async function loadCustomerPrices(customerId: string) {
  await assertLoggedIn();

  if (!customerId) return {} as Record<string, string>;
  const rows = await prisma.customerProductPrice.findMany({ where: { customerId } });
  return Object.fromEntries(rows.map((r) => [r.productId, r.price.toString()]));
}

export async function saveSalesDraft(input: {
  id?: string;
  customerId: string;
  settlement: string;
  remark?: string;
  laterDelivery?: boolean;
  taxInclusive?: boolean;
  needInvoice?: boolean;
  invoiceType?: string;
  booksOnly?: boolean;
  bizDate?: string;
  lines: LineInput[];
}) {
  await assertLoggedIn();
  const isNew = !input.id;

  try {
    const id = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) throw new Error("客户不存在");
      assertSettlement(customer, input.settlement);
      const booksOnly = !!input.booksOnly;
      await assertBooksOnlyAllowed(tx, booksOnly);
      const bizDate = booksOnly || input.bizDate ? parseBizDateInput(input.bizDate) : undefined;
      let material = d(0);
      let service = d(0);
      const lineData = [];
      for (const line of input.lines) {
        if (!line.productId || d(line.qty).lessThanOrEqualTo(0)) continue;
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product) throw new Error("商品不存在");
        const amount = d(line.qty).mul(d(line.price));
        if (product.isStocked) material = material.add(amount);
        else service = service.add(amount);
        lineData.push({
          productId: line.productId,
          qty: d(line.qty),
          price: d(line.price),
          amount,
          isStocked: product.isStocked,
          serialsJson: JSON.stringify(parseSerials(line.serials)),
          saleWarrantyMonths: line.saleWarrantyMonths ?? product.saleWarrantyMonths ?? 12,
        });
      }
      if (!lineData.length) throw new Error("请填写明细");
      const laterDelivery = customer.isWalkIn ? false : !!input.laterDelivery;
      const needInvoice = customer.isWalkIn ? false : !!input.needInvoice;
      const taxInclusive = input.taxInclusive !== false;
      const invoiceType = needInvoice ? input.invoiceType || "plain" : "";
      if (customer.priceMemory) {
        for (const line of lineData) {
          await tx.customerProductPrice.upsert({
            where: { customerId_productId: { customerId: input.customerId, productId: line.productId } },
            create: { customerId: input.customerId, productId: line.productId, price: line.price },
            update: { price: line.price },
          });
        }
      }
      if (input.id) {
        const doc = await tx.salesOrder.findUnique({ where: { id: input.id } });
        if (!doc) throw new Error("单据不存在");
        assertDraft(doc.status);
        await tx.salesOrderLine.deleteMany({ where: { headerId: doc.id } });
        await tx.salesOrder.update({
          where: { id: doc.id },
          data: {
            customerId: input.customerId,
            settlement: input.settlement,
            remark: input.remark ?? "",
            laterDelivery: booksOnly ? false : laterDelivery,
            booksOnly,
            ...(bizDate ? { bizDate } : {}),
            taxInclusive,
            needInvoice,
            invoiceType,
            materialAmt: material,
            serviceAmt: service,
            totalAmt: material.add(service),
            lines: { create: lineData },
          },
        });
        return doc.id;
      }
      const docNo = await nextDocNo(tx, "SO");
      const created = await tx.salesOrder.create({
        data: {
          docNo,
          customerId: input.customerId,
          settlement: input.settlement,
          remark: input.remark ?? "",
          laterDelivery: booksOnly ? false : laterDelivery,
          booksOnly,
          ...(bizDate ? { bizDate } : {}),
          taxInclusive,
          needInvoice,
          invoiceType,
          materialAmt: material,
          serviceAmt: service,
          totalAmt: material.add(service),
          lines: { create: lineData },
        },
      });
      return created.id;
    });
    revalidatePath("/sales");
    if (id) revalidatePath(`/sales/${id}`);
    if (isNew) void notifyWecomSales(id, "create");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function completeSales(
  input: Parameters<typeof saveSalesDraft>[0] & { payMethod?: string; collect?: boolean },
) {
  await assertLoggedIn();

  const hadId = Boolean(input.id);
  const saved = await saveSalesDraft(input);
  if (!saved.ok) return saved;
  const submitted = await submitSales(saved.id, { payMethod: input.payMethod, collect: input.collect });
  if (!submitted.ok) {
    if (!hadId) {
      const doc = await prisma.salesOrder.findUnique({ where: { id: saved.id }, include: { customer: true } });
      if (doc?.status === "draft" && doc.customer.isWalkIn) {
        await prisma.salesOrder.delete({ where: { id: saved.id } });
      }
    }
    return submitted;
  }
  return saved;
}

export async function submitSales(id: string, opts?: { payMethod?: string; collect?: boolean }) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.salesOrder.findUnique({ where: { id }, include: { lines: true, customer: true } });
      if (!doc) throw new Error("单据不存在");
      assertDraft(doc.status);
      if (!doc.booksOnly) {
      const lineInputs = doc.lines.map((l) => ({
        productId: l.productId,
        qty: l.qty.toString(),
        price: l.price.toString(),
        serials: l.serialsJson,
      }));
      const shortages = await checkLinesStock(tx, lineInputs, false);
      if (shortages.length) {
        if (doc.customer.isWalkIn) {
          throw new Error("散客只卖店里现货。请改数量或换成有库存的商品，不能转待采购");
        }
        throw Object.assign(new Error("SHORTAGE"), { shortages, sourceType: "salesOrder", sourceId: doc.id, sourceNo: doc.docNo });
      }
      await checkLinesStock(tx, lineInputs, true);
      for (const line of doc.lines) {
        if (!line.isStocked) continue;
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: d(line.qty).neg(),
          refType: "salesOrder",
          refId: doc.id,
          refNo: doc.docNo,
        });
        const sns = parseSerials(line.serialsJson);
        await outboundSerials(tx, {
          sns,
          status: "sold",
          customerId: doc.customerId,
          saleDocNo: doc.docNo,
        });
        for (const sn of sns) {
          await tx.serialNumber.updateMany({
            where: { sn },
            data: { saleWarranty: addMonths(doc.bizDate, line.saleWarrantyMonths) },
          });
          const product = await tx.product.findUnique({ where: { id: line.productId } });
          const warrantyEnd = addMonths(doc.bizDate, line.saleWarrantyMonths);
          const existed = await tx.customerAsset.findFirst({ where: { customerId: doc.customerId, sn } });
          if (existed) {
            await tx.customerAsset.update({ where: { id: existed.id }, data: { warrantyEnd, name: product?.name || existed.name } });
          } else {
            await tx.customerAsset.create({
              data: {
                customerId: doc.customerId,
                name: product?.name || sn,
                sn,
                warrantyEnd,
              },
            });
          }
        }
      }
      }
      const ar = await createAr(tx, {
        customerId: doc.customerId,
        sourceType: "salesOrder",
        sourceId: doc.id,
        sourceNo: doc.docNo,
        bizDate: doc.bizDate,
        settlement: doc.settlement,
        materialAmt: doc.materialAmt,
        serviceAmt: doc.serviceAmt,
      });
      const collect = doc.booksOnly ? false : (opts?.collect ?? doc.settlement === "cash");
      if (collect && doc.settlement === "cash" && ar) {
        await postReceiptInTx(tx, {
          customerId: doc.customerId,
          method: opts?.payMethod || "cash",
          remark: `销售 ${doc.docNo} 当场收款`,
          lines: [{ arEntryId: ar.id, amount: ar.totalAmt }],
        });
      }
      await addTimeline(tx, {
        customerId: doc.customerId,
        eventType: "销售",
        refType: "salesOrder",
        refId: doc.id,
        refNo: doc.docNo,
        summary: doc.booksOnly ? `期初旧单 ${doc.docNo}` : `销售开单 ${doc.docNo}`,
        amount: doc.totalAmt,
      });
      await tx.salesOrder.update({
        where: { id: doc.id },
        data: { status: "submitted", submittedAt: new Date() },
      });
    });
    revalidatePath("/sales");
    revalidatePath("/purchase-requests");
    revalidatePath("/receipts");
    void notifyWecomSales(id, "submit");
    return { ok: true as const };
  } catch (e) {
    const err = e as Error & { shortages?: { productId: string; qty: string }[]; sourceType?: string; sourceId?: string; sourceNo?: string };
    if (err.shortages?.length && err.sourceId && err.sourceNo && err.sourceType) {
      const prNo = await openPurchaseRequest(err.sourceType, err.sourceId, err.sourceNo, err.shortages);
      return { ok: false as const, error: `库存不足，已记入待采购 ${prNo}，货到入库后再打开本单点开单` };
    }
    return { ok: false as const, error: e instanceof Error ? e.message : "开单失败" };
  }
}

async function reverseSalesPosting(
  tx: Prisma.TransactionClient,
  doc: { id: string; docNo: string; customerId: string; buildConfigId: string | null; booksOnly?: boolean; lines: { isStocked: boolean; productId: string; qty: Prisma.Decimal; returnedQty: Prisma.Decimal; serialsJson: string }[] },
  verb: "作废" | "反审",
) {
  if (doc.buildConfigId) {
    throw new Error(`这张销售单是组装配置带出来的，请到组装配置单${verb}，不要单独${verb}销售单（会把库存加两次）`);
  }
  if (doc.lines.some((l) => d(l.returnedQty).greaterThan(0))) {
    throw new Error(`本单已有退货，请先作废退货单，不能直接${verb}销售单（库存会对不齐）`);
  }
  await reverseReceiptsForSource(tx, "salesOrder", doc.id);
  await voidAr(tx, "salesOrder", doc.id);
  if (!doc.booksOnly) {
  for (const line of doc.lines) {
    if (!line.isStocked) continue;
    await applyStock(tx, {
      productId: line.productId,
      qtyDelta: line.qty,
      refType: "salesOrderVoid",
      refId: doc.id,
      refNo: doc.docNo,
    });
    await restockSerials(tx, parseSerials(line.serialsJson));
  }
  }
  await addTimeline(tx, {
    customerId: doc.customerId,
    eventType: "销售",
    refType: "salesOrder",
    refId: doc.id,
    refNo: doc.docNo,
    summary: `销售${verb} ${doc.docNo}`,
    amount: 0,
  });
}

export async function voidSales(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.salesOrder.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      await reverseSalesPosting(tx, doc, "作废");
      await tx.salesOrder.update({ where: { id }, data: { status: "voided", voidedAt: new Date() } });
    });
    revalidatePath("/sales");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "作废失败" };
  }
}

export async function unsubmitSales(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.salesOrder.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      await reverseSalesPosting(tx, doc, "反审");
      await tx.salesOrder.update({ where: { id }, data: REOPEN_DRAFT });
    });
    revalidatePath("/sales");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}
