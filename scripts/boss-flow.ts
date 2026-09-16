import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { d } from "../src/lib/money";
import { nextDocNo } from "../src/lib/numbering";
import { applyStock, outboundSerials, parseSerials } from "../src/lib/stock";
import { createAr } from "../src/lib/ar";
import { addTimeline } from "../src/lib/timeline";
import { addMonths } from "../src/lib/guards";

async function main() {
  const ram = await prisma.product.findUniqueOrThrow({ where: { code: "RAM16" } });
  const visit = await prisma.product.findUniqueOrThrow({ where: { code: "VISIT" } });
  const hdd = await prisma.product.findUniqueOrThrow({ where: { code: "HDD1T" } });
  const walkin = await prisma.customer.findUniqueOrThrow({ where: { code: "C0001" } });
  const unit = await prisma.customer.findUniqueOrThrow({ where: { code: "C0002" } });

  const po = await prisma.$transaction(async (tx) => {
    const doc = await tx.purchaseReceipt.create({
      data: {
        docNo: await nextDocNo(tx, "PO"),
        supplierId: "seed-sup-1",
        remark: "老板跑流程：补内存",
        lines: { create: [{ productId: ram.id, qty: d(4), cost: d(120), serialsJson: "[]", purchaseWarrantyMonths: 36 }] },
      },
      include: { lines: true },
    });
    for (const line of doc.lines) {
      await applyStock(tx, { productId: line.productId, qtyDelta: line.qty, refType: "purchaseReceipt", refId: doc.id, refNo: doc.docNo });
      await tx.product.update({ where: { id: ram.id }, data: { lastCost: line.cost } });
    }
    return tx.purchaseReceipt.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const so = await prisma.$transaction(async (tx) => {
    const amt = d(180);
    const doc = await tx.salesOrder.create({
      data: {
        docNo: await nextDocNo(tx, "SO"),
        customerId: walkin.id,
        settlement: "cash",
        remark: "柜台现卖一条内存",
        materialAmt: amt,
        totalAmt: amt,
        lines: { create: [{ productId: ram.id, qty: d(1), price: amt, amount: amt, isStocked: true, saleWarrantyMonths: 36, serialsJson: "[]" }] },
      },
    });
    await applyStock(tx, { productId: ram.id, qtyDelta: d(-1), refType: "salesOrder", refId: doc.id, refNo: doc.docNo });
    await createAr(tx, {
      customerId: walkin.id,
      sourceType: "salesOrder",
      sourceId: doc.id,
      sourceNo: doc.docNo,
      bizDate: doc.bizDate,
      settlement: "cash",
      materialAmt: amt,
      serviceAmt: 0,
    });
    await addTimeline(tx, { customerId: walkin.id, eventType: "销售", refType: "salesOrder", refId: doc.id, refNo: doc.docNo, summary: `销售审核 ${doc.docNo}`, amount: amt });
    return tx.salesOrder.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const ar = await prisma.arEntry.findFirstOrThrow({ where: { sourceId: so.id, voided: false } });
  const rc = await prisma.$transaction(async (tx) => {
    const doc = await tx.receipt.create({
      data: {
        docNo: await nextDocNo(tx, "RC"),
        customerId: walkin.id,
        method: "wechat",
        remark: "当场微信",
        amount: ar.totalAmt,
        lines: { create: [{ arEntryId: ar.id, amount: ar.totalAmt }] },
      },
    });
    await tx.arEntry.update({ where: { id: ar.id }, data: { receivedAmt: ar.totalAmt } });
    await addTimeline(tx, { customerId: walkin.id, eventType: "收款", refType: "receipt", refId: doc.id, refNo: doc.docNo, summary: `收款 ${doc.docNo}`, amount: ar.totalAmt });
    return tx.receipt.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const today = new Date();
  const appoint = new Date(today);
  appoint.setHours(16, 0, 0, 0);
  const wo = await prisma.$transaction(async (tx) => {
    const visitAmt = d(80);
    const ramAmt = d(180);
    const billable = visitAmt.add(ramAmt);
    const doc = await tx.workOrder.create({
      data: {
        docNo: await nextDocNo(tx, "WO"),
        customerId: unit.id,
        siteId: "seed-site-1",
        visitType: "onsite",
        appointedAt: appoint,
        processNote: "上门查网，换一条内存",
        nextAdvice: "一周后回访",
        settlement: "monthly",
        materialAmt: ramAmt,
        serviceAmt: visitAmt,
        billableAmt: billable,
        lines: {
          create: [
            { productId: visit.id, qty: d(1), price: visitAmt, amount: visitAmt, isStocked: false, serialsJson: "[]" },
            { productId: ram.id, qty: d(1), price: ramAmt, amount: ramAmt, isStocked: true, serialsJson: "[]" },
          ],
        },
        labors: {
          create: [{ name: "临时小李", workDate: today, days: d(1), dayRate: d(300), amount: d(300) }],
        },
      },
    });
    await applyStock(tx, { productId: ram.id, qtyDelta: d(-1), refType: "workOrder", refId: doc.id, refNo: doc.docNo });
    await createAr(tx, {
      customerId: unit.id,
      sourceType: "workOrder",
      sourceId: doc.id,
      sourceNo: doc.docNo,
      bizDate: doc.bizDate,
      settlement: "monthly",
      materialAmt: ramAmt,
      serviceAmt: visitAmt,
    });
    await addTimeline(tx, { customerId: unit.id, eventType: "工单", refType: "workOrder", refId: doc.id, refNo: doc.docNo, summary: `工单审核 ${doc.docNo}`, amount: billable });
    await tx.laborRateHint.upsert({ where: { name: "临时小李" }, create: { name: "临时小李", dayRate: d(300) }, update: { dayRate: d(300) } });
    return tx.workOrder.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date(), woStatus: "done" } });
  });

  const hddSo = await prisma.$transaction(async (tx) => {
    const amt = d(320);
    const doc = await tx.salesOrder.create({
      data: {
        docNo: await nextDocNo(tx, "SO"),
        customerId: walkin.id,
        settlement: "cash",
        remark: "卖一块带唯一 SN 的硬盘",
        materialAmt: amt,
        totalAmt: amt,
        lines: {
          create: [{ productId: hdd.id, qty: d(1), price: amt, amount: amt, isStocked: true, saleWarrantyMonths: 24, serialsJson: JSON.stringify(["SN-HDD-001"]) }],
        },
      },
    });
    await applyStock(tx, { productId: hdd.id, qtyDelta: d(-1), refType: "salesOrder", refId: doc.id, refNo: doc.docNo });
    await outboundSerials(tx, { sns: parseSerials(JSON.stringify(["SN-HDD-001"])), status: "sold", customerId: walkin.id, saleDocNo: doc.docNo });
    await tx.serialNumber.updateMany({ where: { sn: "SN-HDD-001" }, data: { saleWarranty: addMonths(doc.bizDate, 24) } });
    await createAr(tx, {
      customerId: walkin.id,
      sourceType: "salesOrder",
      sourceId: doc.id,
      sourceNo: doc.docNo,
      bizDate: doc.bizDate,
      settlement: "cash",
      materialAmt: amt,
      serviceAmt: 0,
    });
    await addTimeline(tx, { customerId: walkin.id, eventType: "销售", refType: "salesOrder", refId: doc.id, refNo: doc.docNo, summary: `销售审核 ${doc.docNo}`, amount: amt });
    return tx.salesOrder.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const ramBal = await prisma.stockBalance.findFirst({ where: { productId: ram.id } });
  const hddBal = await prisma.stockBalance.findFirst({ where: { productId: hdd.id } });
  const sn = await prisma.serialNumber.findUnique({ where: { sn: "SN-HDD-001" } });
  const unpaid = (await prisma.arEntry.findMany({ where: { voided: false } })).filter((a) => Number(a.totalAmt) > Number(a.receivedAmt));

  console.log(
    JSON.stringify(
      {
        purchaseId: po.id,
        purchaseNo: po.docNo,
        salesId: so.id,
        salesNo: so.docNo,
        receiptId: rc.id,
        receiptNo: rc.docNo,
        workOrderId: wo.id,
        workOrderNo: wo.docNo,
        hddSalesId: hddSo.id,
        hddSalesNo: hddSo.docNo,
        ramQty: ramBal ? String(ramBal.qty) : null,
        hddQty: hddBal ? String(hddBal.qty) : null,
        hddSnStatus: sn?.status,
        unpaid: unpaid.map((a) => ({ sourceNo: a.sourceNo, open: Number(a.totalAmt) - Number(a.receivedAmt) })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
