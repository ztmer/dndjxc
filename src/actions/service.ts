"use server";

import { assertLoggedIn } from "@/lib/require-session";

import { prisma } from "@/lib/prisma";
import { d } from "@/lib/money";
import { nextDocNo } from "@/lib/numbering";
import { applyStock, assertSellableQty, outboundSerials, parseSerials, restockSerials, assertTrackedSerialCount, returnSerials, assertReturnSerialsMatch, restoreOutboundSerials } from "@/lib/stock";
import { createAr, voidAr } from "@/lib/ar";
import { addTimeline } from "@/lib/timeline";
import { addMonths, assertDraft, assertSettlement, assertSubmitted, REOPEN_DRAFT } from "@/lib/guards";
import { openPurchaseRequest } from "@/lib/purchase-request";
import { postReceiptInTx, reverseReceiptsForSource } from "@/lib/receipt-post";
import { revalidatePath } from "next/cache";
import { notifyWecomWorkOrder, notifyWecomInstall, notifyWecomContract } from "@/lib/wecom";
import { outboundSnForced } from "@/lib/shop-biz";
import { assertBooksOnlyAllowed, parseBizDateInput } from "@/lib/opening-books";

export async function saveBuildDraft(input: {
  id?: string;
  customerId: string;
  modelName: string;
  laborFee: string;
  unitSn?: string;
  remark?: string;
  lines: { productId: string; qty: string; price: string; serials?: string; slot?: string }[];
}) {
  await assertLoggedIn();
  const isNew = !input.id;

  try {
    const id = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) throw new Error("客户不存在");
      const lineData = [];
      for (const line of input.lines) {
        if (!line.productId || d(line.qty).lessThanOrEqualTo(0)) continue;
        lineData.push({
          productId: line.productId,
          slot: line.slot ?? "",
          qty: d(line.qty),
          price: d(line.price),
          amount: d(line.qty).mul(d(line.price)),
          serialsJson: JSON.stringify(parseSerials(line.serials)),
        });
      }
      if (!lineData.length) throw new Error("组装机必须填写配件明细");
      if (input.id) {
        const doc = await tx.buildConfig.findUnique({ where: { id: input.id } });
        if (!doc) throw new Error("单据不存在");
        assertDraft(doc.status);
        await tx.buildConfigLine.deleteMany({ where: { headerId: doc.id } });
        await tx.buildConfig.update({
          where: { id: doc.id },
          data: {
            customerId: input.customerId,
            modelName: input.modelName,
            laborFee: d(input.laborFee),
            unitSn: input.unitSn ?? "",
            remark: input.remark ?? "",
            lines: { create: lineData },
          },
        });
        return doc.id;
      }
      const created = await tx.buildConfig.create({
        data: {
          docNo: await nextDocNo(tx, "CFG"),
          customerId: input.customerId,
          modelName: input.modelName,
          laborFee: d(input.laborFee),
          unitSn: input.unitSn ?? "",
          remark: input.remark ?? "",
          lines: { create: lineData },
        },
      });
      return created.id;
    });
    revalidatePath("/builds");
    revalidatePath("/m/builds");
    if (isNew) void notifyWecomInstall(id, "create");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function submitBuild(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.buildConfig.findUnique({
        where: { id },
        include: { lines: true, customer: true, salesOrder: true },
      });
      if (!doc) throw new Error("单据不存在");
      assertDraft(doc.status);
      const shortages: { productId: string; qty: string }[] = [];
      for (const line of doc.lines) {
        try {
          await assertSellableQty(tx, line.productId, line.qty);
        } catch {
          shortages.push({ productId: line.productId, qty: line.qty.toString() });
        }
      }
      if (shortages.length) {
        if (doc.customer.isWalkIn) throw new Error("散客只卖店里现货。请改数量或换成有库存的配件，不能转待采购");
        throw Object.assign(new Error("SHORTAGE"), {
          shortages,
          sourceType: "buildConfig",
          sourceId: doc.id,
          sourceNo: doc.docNo,
        });
      }
      let material = d(0);
      for (const line of doc.lines) {
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product?.isStocked) throw new Error("配置单配件必须是实物商品");
        const sns = parseSerials(line.serialsJson);
        await assertTrackedSerialCount(tx, line.productId, line.qty, sns, "出库", { force: await outboundSnForced(tx) });
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: d(line.qty).neg(),
          refType: "buildConfig",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await outboundSerials(tx, {
          sns,
          status: "installed",
          customerId: doc.customerId,
        });
        material = material.add(line.amount);
      }
      const labor = d(doc.laborFee);
      const soLines = doc.lines.map((l) => ({
        productId: l.productId,
        qty: l.qty,
        price: l.price,
        amount: l.amount,
        isStocked: true,
        serialsJson: l.serialsJson,
      }));
      const soPayload = {
        status: "submitted" as const,
        submittedAt: new Date(),
        voidedAt: null,
        customerId: doc.customerId,
        settlement: doc.customer.settlement,
        buildConfigId: doc.id,
        materialAmt: material,
        serviceAmt: labor,
        totalAmt: material.add(labor),
        remark: `组装 ${doc.modelName} ${doc.unitSn}`,
      };
      const so = doc.salesOrder
        ? await (async () => {
            await tx.salesOrderLine.deleteMany({ where: { headerId: doc.salesOrder!.id } });
            return tx.salesOrder.update({
              where: { id: doc.salesOrder!.id },
              data: { ...soPayload, lines: { create: soLines } },
            });
          })()
        : await tx.salesOrder.create({
            data: {
              docNo: await nextDocNo(tx, "SO"),
              ...soPayload,
              lines: { create: soLines },
            },
          });
      const installedSns = doc.lines.flatMap((l) => parseSerials(l.serialsJson));
      if (installedSns.length) {
        await tx.serialNumber.updateMany({
          where: { sn: { in: installedSns } },
          data: { saleDocNo: so.docNo },
        });
      }
      await createAr(tx, {
        customerId: doc.customerId,
        sourceType: "salesOrder",
        sourceId: so.id,
        sourceNo: so.docNo,
        bizDate: doc.bizDate,
        settlement: doc.customer.settlement,
        materialAmt: material,
        serviceAmt: labor,
      });
      await addTimeline(tx, {
        customerId: doc.customerId,
        eventType: "配置单",
        refType: "buildConfig",
        refId: doc.id,
        refNo: doc.docNo,
        summary: `组装配置 ${doc.docNo} ${doc.modelName}，销售 ${so.docNo}`,
        amount: material.add(labor),
      });
      await tx.buildConfig.update({
        where: { id },
        data: { status: "submitted", submittedAt: new Date() },
      });
    });
    revalidatePath("/builds");
    revalidatePath("/m/builds");
    revalidatePath("/sales");
    void notifyWecomInstall(id, "submit");
    return { ok: true as const };
  } catch (e) {
    const err = e as Error & { shortages?: { productId: string; qty: string }[]; sourceType?: string; sourceId?: string; sourceNo?: string };
    if (err.shortages?.length && err.sourceId && err.sourceNo && err.sourceType) {
      const prNo = await openPurchaseRequest(err.sourceType, err.sourceId, err.sourceNo, err.shortages);
      return { ok: false as const, error: `库存不足，已生成待采购 ${prNo}，货到后再打开本单点确认` };
    }
    return { ok: false as const, error: e instanceof Error ? e.message : "确认失败" };
  }
}

export async function voidBuild(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.buildConfig.findUnique({
        where: { id },
        include: { lines: true, salesOrder: { include: { lines: true } } },
      });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      if (doc.salesOrder?.lines.some((l) => d(l.returnedQty).greaterThan(0))) {
        throw new Error("带出的销售单已有退货，请先作废退货单");
      }
      if (doc.salesOrder) {
        await reverseReceiptsForSource(tx, "salesOrder", doc.salesOrder.id);
        await voidAr(tx, "salesOrder", doc.salesOrder.id);
        await tx.salesOrder.update({
          where: { id: doc.salesOrder.id },
          data: { status: "voided", voidedAt: new Date() },
        });
      }
      for (const line of doc.lines) {
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: line.qty,
          refType: "buildConfigVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await restockSerials(tx, parseSerials(line.serialsJson));
      }
      await tx.buildConfig.update({ where: { id }, data: { status: "voided", voidedAt: new Date() } });
    });
    revalidatePath("/builds");
    revalidatePath("/m/builds");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "作废失败" };
  }
}

export async function unsubmitBuild(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.buildConfig.findUnique({
        where: { id },
        include: { lines: true, salesOrder: { include: { lines: true } } },
      });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      if (doc.salesOrder?.lines.some((l) => d(l.returnedQty).greaterThan(0))) {
        throw new Error("带出的销售单已有退货，请先作废退货单");
      }
      if (doc.salesOrder) {
        await reverseReceiptsForSource(tx, "salesOrder", doc.salesOrder.id);
        await voidAr(tx, "salesOrder", doc.salesOrder.id);
        await tx.salesOrder.update({
          where: { id: doc.salesOrder.id },
          data: REOPEN_DRAFT,
        });
      }
      for (const line of doc.lines) {
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: line.qty,
          refType: "buildConfigVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await restockSerials(tx, parseSerials(line.serialsJson));
      }
      await tx.buildConfig.update({ where: { id }, data: REOPEN_DRAFT });
    });
    revalidatePath("/builds");
    revalidatePath("/m/builds");
    revalidatePath("/sales");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}

type WoLine = {
  productId: string;
  qty: string;
  price: string;
  serials?: string;
  isWarrantyFree?: boolean;
  isContractExtra?: boolean;
};

export async function saveWorkOrderDraft(input: {
  id?: string;
  customerId: string;
  siteId?: string;
  projectId?: string;
  visitType: string;
  appointedAt?: string;
  processNote?: string;
  nextAdvice?: string;
  settlement: string;
  booksOnly?: boolean;
  bizDate?: string;
  lines: WoLine[];
  labors: { name: string; workDate: string; days: string; dayRate: string }[];
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
      let project: { id: string; contractId: string } | null = null;
      if (input.projectId) {
        project = await tx.project.findUnique({ where: { id: input.projectId } });
        if (!project) throw new Error("工程不存在");
      }
      let material = d(0);
      let service = d(0);
      let billable = d(0);
      const lineData = [];
      for (const line of input.lines) {
        if (!line.productId || d(line.qty).lessThanOrEqualTo(0)) continue;
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product) throw new Error("商品不存在");
        const amount = d(line.qty).mul(d(line.price));
        if (product.isStocked) material = material.add(amount);
        else service = service.add(amount);
        const extra = !!line.isContractExtra;
        const free = !!line.isWarrantyFree;
        const counts = project ? extra && !free : !free;
        if (counts) billable = billable.add(amount);
        lineData.push({
          productId: line.productId,
          qty: d(line.qty),
          price: d(line.price),
          amount,
          isStocked: product.isStocked,
          isWarrantyFree: free,
          isContractExtra: extra,
          serialsJson: JSON.stringify(parseSerials(line.serials)),
        });
      }
      const laborData = input.labors
        .filter((l) => l.name && d(l.days).greaterThan(0))
        .map((l) => ({
          name: l.name,
          workDate: new Date(l.workDate),
          days: d(l.days),
          dayRate: d(l.dayRate),
          amount: d(l.days).mul(d(l.dayRate)),
        }));
      for (const l of laborData) {
        await tx.laborRateHint.upsert({
          where: { name: l.name },
          create: { name: l.name, dayRate: l.dayRate },
          update: { dayRate: l.dayRate },
        });
      }
      const payload = {
        customerId: input.customerId,
        siteId: input.siteId || null,
        projectId: input.projectId || null,
        visitType: input.visitType,
        appointedAt: input.appointedAt ? new Date(input.appointedAt) : null,
        processNote: input.processNote ?? "",
        nextAdvice: input.nextAdvice ?? "",
        settlement: input.settlement,
        booksOnly,
        ...(bizDate ? { bizDate } : {}),
        materialAmt: material,
        serviceAmt: service,
        billableAmt: billable,
      };
      if (!lineData.length && !payload.processNote) {
        throw new Error("请填材料/服务，或至少写过程记录");
      }
      if (input.id) {
        const doc = await tx.workOrder.findUnique({ where: { id: input.id } });
        if (!doc) throw new Error("单据不存在");
        assertDraft(doc.status);
        await tx.workOrderLine.deleteMany({ where: { headerId: doc.id } });
        await tx.dayLabor.deleteMany({ where: { workOrderId: doc.id } });
        await tx.workOrder.update({
          where: { id: doc.id },
          data: {
            ...payload,
            lines: { create: lineData },
            labors: { create: laborData },
          },
        });
        return doc.id;
      }
      const created = await tx.workOrder.create({
        data: {
          docNo: await nextDocNo(tx, "WO"),
          ...payload,
          lines: { create: lineData },
          labors: { create: laborData },
        },
      });
      return created.id;
    });
    revalidatePath("/work-orders");
    revalidatePath("/projects");
    if (isNew) void notifyWecomWorkOrder(id, "create");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function submitWorkOrderAndCollect(id: string) {
  return submitWorkOrder(id, { collect: true });
}

export async function submitWorkOrder(id: string, opts?: { collect?: boolean }) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.workOrder.findUnique({
        where: { id },
        include: { lines: true, project: true, customer: true },
      });
      if (!doc) throw new Error("单据不存在");
      assertDraft(doc.status);
      if (!doc.booksOnly) {
      const shortages: { productId: string; qty: string }[] = [];
      for (const line of doc.lines) {
        if (!line.isStocked) continue;
        try {
          await assertSellableQty(tx, line.productId, line.qty);
        } catch {
          shortages.push({ productId: line.productId, qty: line.qty.toString() });
        }
      }
      if (shortages.length) {
        if (doc.customer.isWalkIn) throw new Error("散客只卖店里现货。请改数量或换成有库存的商品，不能转待采购");
        throw Object.assign(new Error("SHORTAGE"), {
          shortages,
          sourceType: "workOrder",
          sourceId: doc.id,
          sourceNo: doc.docNo,
        });
      }
      for (const line of doc.lines) {
        if (!line.isStocked) continue;
        const sns = parseSerials(line.serialsJson);
        await assertTrackedSerialCount(tx, line.productId, line.qty, sns, "出库", { force: await outboundSnForced(tx) });
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: d(line.qty).neg(),
          refType: "workOrder",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await outboundSerials(tx, {
          sns,
          status: "installed",
          customerId: doc.customerId,
          siteId: doc.siteId ?? undefined,
          saleDocNo: doc.docNo,
        });
      }
      }
      if (d(doc.billableAmt).greaterThan(0)) {
        const extras = doc.lines.filter((l) => {
          if (l.isWarrantyFree) return false;
          if (doc.projectId) return l.isContractExtra;
          return true;
        });
        let mat = d(0);
        let svc = d(0);
        for (const l of extras) {
          const p = await tx.product.findUnique({ where: { id: l.productId } });
          if (p?.isStocked) mat = mat.add(l.amount);
          else svc = svc.add(l.amount);
        }
        const ar = await createAr(tx, {
          customerId: doc.customerId,
          sourceType: "workOrder",
          sourceId: doc.id,
          sourceNo: doc.docNo,
          bizDate: doc.bizDate,
          settlement: doc.settlement,
          materialAmt: mat,
          serviceAmt: svc,
        });
        // 默认挂未收；只有点「完工并收款」才当场核销。迟点给钱走收款单。
        if (!doc.booksOnly && opts?.collect && ar) {
          await postReceiptInTx(tx, {
            customerId: doc.customerId,
            method: "cash",
            remark: `工单 ${doc.docNo} 当场收款`,
            lines: [{ arEntryId: ar.id, amount: ar.totalAmt }],
          });
        }
      }
      await addTimeline(tx, {
        customerId: doc.customerId,
        eventType: "工单",
        refType: "workOrder",
        refId: doc.id,
        refNo: doc.docNo,
        summary: doc.booksOnly ? `期初旧单 ${doc.docNo}` : `工单完工 ${doc.docNo}`,
        amount: doc.billableAmt,
      });
      await tx.workOrder.update({
        where: { id },
        data: { status: "submitted", submittedAt: new Date(), woStatus: "done" },
      });
      if (doc.projectId) {
        const pj = await tx.project.findUnique({ where: { id: doc.projectId } });
        if (pj && pj.progress === "not_started") {
          await tx.project.update({ where: { id: pj.id }, data: { progress: "in_progress" } });
          await addTimeline(tx, {
            customerId: doc.customerId,
            eventType: "工程进度",
            refType: "project",
            refId: pj.id,
            refNo: pj.docNo,
            summary: `工程开工 ${pj.docNo}（工单 ${doc.docNo}）`,
          });
        }
      }
    });
    revalidatePath("/work-orders");
    revalidatePath("/projects");
    revalidatePath("/receipts");
    void notifyWecomWorkOrder(id, "submit");
    return { ok: true as const };
  } catch (e) {
    const err = e as Error & { shortages?: { productId: string; qty: string }[]; sourceType?: string; sourceId?: string; sourceNo?: string };
    if (err.shortages?.length && err.sourceId && err.sourceNo && err.sourceType) {
      const prNo = await openPurchaseRequest(err.sourceType, err.sourceId, err.sourceNo, err.shortages);
      return { ok: false as const, error: `库存不足，已生成待采购 ${prNo}，货到入库后再打开本单点完工` };
    }
    return { ok: false as const, error: e instanceof Error ? e.message : "完工失败" };
  }
}

export async function voidWorkOrder(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.workOrder.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      if (doc.lines.some((l) => d(l.returnedQty).greaterThan(0))) {
        throw new Error("本单已有退料，请先作废退料单，不能直接作废工单（库存会对不齐）");
      }
      await reverseReceiptsForSource(tx, "workOrder", doc.id);
      await voidAr(tx, "workOrder", doc.id);
      if (!doc.booksOnly) {
      for (const line of doc.lines) {
        if (!line.isStocked) continue;
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: line.qty,
          refType: "workOrderVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await restockSerials(tx, parseSerials(line.serialsJson));
      }
      }
      await tx.workOrder.update({ where: { id }, data: { status: "voided", voidedAt: new Date() } });
    });
    revalidatePath("/work-orders");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "作废失败" };
  }
}

export async function unsubmitWorkOrder(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.workOrder.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      if (doc.lines.some((l) => d(l.returnedQty).greaterThan(0))) {
        throw new Error("本单已有退料，请先作废退料单，不能直接反审工单（库存会对不齐）");
      }
      await reverseReceiptsForSource(tx, "workOrder", doc.id);
      await voidAr(tx, "workOrder", doc.id);
      if (!doc.booksOnly) {
      for (const line of doc.lines) {
        if (!line.isStocked) continue;
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: line.qty,
          refType: "workOrderVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await restockSerials(tx, parseSerials(line.serialsJson));
      }
      }
      await tx.workOrder.update({ where: { id }, data: REOPEN_DRAFT });
    });
    revalidatePath("/work-orders");
    revalidatePath("/m/work-orders");
    revalidatePath("/stock");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}

export async function saveWorkReturnDraft(input: {
  id?: string;
  workOrderId: string;
  remark?: string;
  lines: { workOrderLineId: string; qty: string; serials?: string }[];
}) {
  await assertLoggedIn();

  try {
    const id = await prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({
        where: { id: input.workOrderId },
        include: { lines: true },
      });
      if (!wo || wo.status !== "submitted") throw new Error("只能对已完工工单退料");
      const lineData = [];
      for (const line of input.lines) {
        const src = wo.lines.find((l) => l.id === line.workOrderLineId);
        if (!src) throw new Error("工单明细不存在");
        const qty = d(line.qty);
        if (qty.lessThanOrEqualTo(0)) continue;
        if (!src.isStocked) throw new Error("费用行不能退料");
        if (qty.add(src.returnedQty).greaterThan(src.qty)) throw new Error("退料超过可退");
        lineData.push({
          workOrderLineId: src.id,
          productId: src.productId,
          qty,
          serialsJson: JSON.stringify(parseSerials(line.serials)),
        });
      }
      if (!lineData.length) throw new Error("请填写退料明细");
      if (input.id) {
        const doc = await tx.workOrderReturn.findUnique({ where: { id: input.id } });
        if (!doc) throw new Error("单据不存在");
        assertDraft(doc.status);
        await tx.workOrderReturnLine.deleteMany({ where: { headerId: doc.id } });
        await tx.workOrderReturn.update({
          where: { id: doc.id },
          data: { remark: input.remark ?? "", lines: { create: lineData } },
        });
        return doc.id;
      }
      const created = await tx.workOrderReturn.create({
        data: {
          docNo: await nextDocNo(tx, "WR"),
          workOrderId: wo.id,
          remark: input.remark ?? "",
          lines: { create: lineData },
        },
      });
      return created.id;
    });
    revalidatePath("/work-returns");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function submitWorkReturn(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.workOrderReturn.findUnique({
        where: { id },
        include: {
          lines: { include: { workOrderLine: true } },
          workOrder: true,
        },
      });
      if (!doc) throw new Error("单据不存在");
      assertDraft(doc.status);
      let mat = d(0);
      let svc = d(0);
      for (const line of doc.lines) {
        const src = line.workOrderLine;
        await tx.workOrderLine.update({
          where: { id: src.id },
          data: { returnedQty: d(src.returnedQty).add(line.qty) },
        });
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: line.qty,
          refType: "workOrderReturn",
          refId: doc.id,
          refNo: doc.docNo,
        });
        const sns = parseSerials(line.serialsJson);
        await assertTrackedSerialCount(tx, line.productId, line.qty, sns, "退料", { force: await outboundSnForced(tx) });
        if (sns.length) {
          await assertReturnSerialsMatch(tx, {
            sns,
            productId: line.productId,
            saleDocNo: doc.workOrder.docNo,
            expectStatus: ["installed", "sold"],
          });
        }
        await returnSerials(tx, sns);
        const counts = doc.workOrder.projectId ? src.isContractExtra && !src.isWarrantyFree : !src.isWarrantyFree;
        if (counts) {
          if (src.isStocked) mat = mat.add(src.price.mul(line.qty));
          else svc = svc.add(src.price.mul(line.qty));
        }
      }
      if (mat.add(svc).greaterThan(0)) {
        const { adjustAr } = await import("@/lib/ar");
        await adjustAr(tx, "workOrder", doc.workOrderId, mat.neg(), svc.neg());
      }
      await addTimeline(tx, {
        customerId: doc.workOrder.customerId,
        eventType: "工单退料",
        refType: "workOrderReturn",
        refId: doc.id,
        refNo: doc.docNo,
        summary: `工单退料 ${doc.docNo}`,
        amount: mat.add(svc).neg(),
      });
      await tx.workOrderReturn.update({
        where: { id },
        data: { status: "submitted", submittedAt: new Date() },
      });
    });
    revalidatePath("/work-returns");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "确认失败" };
  }
}

export async function voidWorkReturn(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.workOrderReturn.findUnique({
        where: { id },
        include: {
          lines: { include: { workOrderLine: true } },
          workOrder: true,
        },
      });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      let mat = d(0);
      let svc = d(0);
      for (const line of doc.lines) {
        const src = line.workOrderLine;
        await tx.workOrderLine.update({
          where: { id: src.id },
          data: { returnedQty: d(src.returnedQty).sub(line.qty) },
        });
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: d(line.qty).neg(),
          refType: "workOrderReturnVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await restoreOutboundSerials(tx, {
          sns: parseSerials(line.serialsJson),
          status: "installed",
          customerId: doc.workOrder.customerId,
          siteId: doc.workOrder.siteId,
          saleDocNo: doc.workOrder.docNo,
        });
        const counts = doc.workOrder.projectId ? src.isContractExtra && !src.isWarrantyFree : !src.isWarrantyFree;
        if (counts) {
          if (src.isStocked) mat = mat.add(src.price.mul(line.qty));
          else svc = svc.add(src.price.mul(line.qty));
        }
      }
      if (mat.add(svc).greaterThan(0)) {
        const { adjustAr } = await import("@/lib/ar");
        await adjustAr(tx, "workOrder", doc.workOrderId, mat, svc);
      }
      await tx.workOrderReturn.update({ where: { id }, data: { status: "voided", voidedAt: new Date() } });
    });
    revalidatePath("/work-returns");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "作废失败" };
  }
}

export async function unsubmitWorkReturn(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.workOrderReturn.findUnique({
        where: { id },
        include: {
          lines: { include: { workOrderLine: true } },
          workOrder: true,
        },
      });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      let mat = d(0);
      let svc = d(0);
      for (const line of doc.lines) {
        const src = line.workOrderLine;
        await tx.workOrderLine.update({
          where: { id: src.id },
          data: { returnedQty: d(src.returnedQty).sub(line.qty) },
        });
        await applyStock(tx, {
          productId: line.productId,
          qtyDelta: d(line.qty).neg(),
          refType: "workOrderReturnVoid",
          refId: doc.id,
          refNo: doc.docNo,
        });
        await restoreOutboundSerials(tx, {
          sns: parseSerials(line.serialsJson),
          status: "installed",
          customerId: doc.workOrder.customerId,
          siteId: doc.workOrder.siteId,
          saleDocNo: doc.workOrder.docNo,
        });
        const counts = doc.workOrder.projectId ? src.isContractExtra && !src.isWarrantyFree : !src.isWarrantyFree;
        if (counts) {
          if (src.isStocked) mat = mat.add(src.price.mul(line.qty));
          else svc = svc.add(src.price.mul(line.qty));
        }
      }
      if (mat.add(svc).greaterThan(0)) {
        const { adjustAr } = await import("@/lib/ar");
        await adjustAr(tx, "workOrder", doc.workOrderId, mat, svc);
      }
      await tx.workOrderReturn.update({ where: { id }, data: REOPEN_DRAFT });
    });
    revalidatePath("/work-returns");
    revalidatePath("/stock");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}

export async function saveContractDraft(input: {
  id?: string;
  customerId: string;
  title: string;
  amount: string;
  warrantyMonths: string;
  settlement: string;
  durationNote?: string;
  taxInclusive?: boolean;
  needInvoice?: boolean;
  invoiceType?: string;
  remark?: string;
  signDate?: string;
  schedules: { name: string; amount: string; dueDate?: string }[];
}) {
  await assertLoggedIn();
  const isNew = !input.id;

  try {
    const id = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) throw new Error("客户不存在");
      assertSettlement(customer, input.settlement);
      const schedules = input.schedules
        .filter((s) => s.name)
        .map((s) => ({
          name: s.name,
          amount: d(s.amount),
          dueDate: s.dueDate ? new Date(s.dueDate) : null,
        }));
      const needInvoice = !!input.needInvoice;
      const data = {
        customerId: input.customerId,
        title: input.title,
        amount: d(input.amount),
        warrantyMonths: Number(input.warrantyMonths) || 12,
        settlement: input.settlement,
        durationNote: input.durationNote ?? "",
        taxInclusive: input.taxInclusive !== false,
        needInvoice,
        invoiceType: needInvoice ? (input.invoiceType || "plain") : "",
        remark: input.remark ?? "",
      };
      if (input.signDate) {
        Object.assign(data, { signDate: new Date(input.signDate) });
      }
      if (input.id) {
        const doc = await tx.contract.findUnique({ where: { id: input.id } });
        if (!doc) throw new Error("合同不存在");
        assertDraft(doc.status);
        await tx.contractSchedule.deleteMany({ where: { contractId: doc.id } });
        await tx.contract.update({
          where: { id: doc.id },
          data: { ...data, schedules: { create: schedules } },
        });
        return doc.id;
      }
      const created = await tx.contract.create({
        data: {
          docNo: await nextDocNo(tx, "CT"),
          ...data,
          schedules: { create: schedules },
        },
      });
      return created.id;
    });
    revalidatePath("/contracts");
    if (isNew) void notifyWecomContract(id, "create");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function submitContract(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.contract.findUnique({ where: { id } });
      if (!doc) throw new Error("合同不存在");
      assertDraft(doc.status);
      await createAr(tx, {
        customerId: doc.customerId,
        sourceType: "contract",
        sourceId: doc.id,
        sourceNo: doc.docNo,
        bizDate: doc.signDate,
        settlement: doc.settlement,
        materialAmt: 0,
        serviceAmt: doc.amount,
      });
      await addTimeline(tx, {
        customerId: doc.customerId,
        eventType: "合同",
        refType: "contract",
        refId: doc.id,
        refNo: doc.docNo,
        summary: `合同下单 ${doc.docNo} ${doc.title}`,
        amount: doc.amount,
      });
      await tx.contract.update({
        where: { id },
        data: { status: "submitted", submittedAt: new Date() },
      });
    });
    revalidatePath("/contracts");
    revalidatePath("/projects");
    void notifyWecomContract(id, "submit");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "确认失败" };
  }
}

export async function voidContract(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.contract.findUnique({ where: { id }, include: { projects: true } });
      if (!doc) throw new Error("合同不存在");
      assertSubmitted(doc.status);
      await reverseReceiptsForSource(tx, "contract", doc.id);
      await voidAr(tx, "contract", doc.id);
      await tx.contract.update({ where: { id }, data: { status: "voided", voidedAt: new Date() } });
    });
    revalidatePath("/contracts");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "作废失败" };
  }
}

export async function unsubmitContract(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.contract.findUnique({ where: { id } });
      if (!doc) throw new Error("合同不存在");
      assertSubmitted(doc.status);
      await reverseReceiptsForSource(tx, "contract", doc.id);
      await voidAr(tx, "contract", doc.id);
      await tx.contract.update({ where: { id }, data: REOPEN_DRAFT });
    });
    revalidatePath("/contracts");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}

export async function saveProject(input: {
  id?: string;
  contractId: string;
  name: string;
  siteId?: string;
  remark?: string;
}) {
  await assertLoggedIn();

  try {
    const id = await prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id: input.contractId } });
      if (!contract || contract.status !== "submitted") throw new Error("工程必须挂已下单合同");
      if (input.id) {
        await tx.project.update({
          where: { id: input.id },
          data: { name: input.name, siteId: input.siteId || null, remark: input.remark ?? "" },
        });
        return input.id;
      }
      const created = await tx.project.create({
        data: {
          docNo: await nextDocNo(tx, "PJ"),
          contractId: input.contractId,
          name: input.name,
          siteId: input.siteId || null,
          remark: input.remark ?? "",
        },
      });
      return created.id;
    });
    revalidatePath("/projects");
    revalidatePath("/contracts");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function startProject(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const pj = await tx.project.findUnique({ where: { id }, include: { contract: true } });
      if (!pj) throw new Error("工程不存在");
      if (pj.progress !== "not_started") throw new Error("已经开工或验收");
      await tx.project.update({ where: { id }, data: { progress: "in_progress" } });
      await addTimeline(tx, {
        customerId: pj.contract.customerId,
        eventType: "工程进度",
        refType: "project",
        refId: pj.id,
        refNo: pj.docNo,
        summary: `工程开工 ${pj.docNo}`,
      });
    });
    revalidatePath("/projects");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "开工失败" };
  }
}

export async function acceptProject(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const pj = await tx.project.findUnique({
        where: { id },
        include: { contract: true, workOrders: true },
      });
      if (!pj) throw new Error("工程不存在");
      if (pj.progress === "in_warranty" || pj.acceptedAt) throw new Error("已经验收");
      const doneWo = pj.workOrders.filter((w) => w.status === "submitted");
      if (!doneWo.length) throw new Error("请先做施工工单并完工出库，再验收");
      const acceptedAt = new Date();
      const warrantyEnd = addMonths(acceptedAt, pj.contract.warrantyMonths);
      await tx.project.update({
        where: { id },
        data: { progress: "in_warranty", acceptedAt, warrantyEnd },
      });
      await addTimeline(tx, {
        customerId: pj.contract.customerId,
        eventType: "工程进度",
        refType: "project",
        refId: pj.id,
        refNo: pj.docNo,
        summary: `工程验收 ${pj.docNo}，质保至 ${warrantyEnd.toLocaleDateString("zh-CN")}`,
      });
    });
    revalidatePath("/projects");
    revalidatePath("/contracts");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "验收失败" };
  }
}
