/**
 * 串号闭环（不清库）：入库作废删档、退货作废恢复已售。
 * npx tsx scripts/sn-loop.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { d } from "../src/lib/money";
import { nextDocNo } from "../src/lib/numbering";
import {
  applyStock,
  inboundSerials,
  outboundSerials,
  returnSerials,
  restockSerials,
  voidInboundSerials,
  restoreOutboundSerials,
  assertTrackedSerialCount,
  parseSerials,
} from "../src/lib/stock";
import { addMonths } from "../src/lib/guards";

const TAG = `【SN环${Date.now().toString(36).slice(-6)}】`;
const fails: string[] = [];
function check(ok: boolean, msg: string) {
  if (!ok) fails.push(msg);
}

async function st(sn: string) {
  return (await prisma.serialNumber.findUnique({ where: { sn } }))?.status ?? null;
}

async function run() {
  const leaf =
    (await prisma.productCategory.findFirst({ where: { parentId: { not: null } } })) ??
    (await prisma.productCategory.findFirst());
  if (!leaf) throw new Error("没有商品分类");
  const nCust = await prisma.customer.count();
  const customer = await prisma.customer.create({
    data: {
      code: `C${String(nCust + 1).padStart(4, "0")}`,
      name: `${TAG}串号客户`,
      isWalkIn: false,
      settlement: "cash",
    },
  });
  const supplier = await prisma.supplier.create({ data: { name: `${TAG}串号批发`, remark: TAG } });
  const nProd = await prisma.product.count();
  const hdd = await prisma.product.create({
    data: {
      code: `P${String(nProd + 1).padStart(4, "0")}`,
      name: `${TAG}管SN硬盘`,
      brand: "希捷",
      unit: "块",
      category: leaf.name,
      categoryId: leaf.id,
      isStocked: true,
      trackSerial: true,
      salePrice: d(329),
      lastCost: d(240),
      remark: TAG,
    },
  });

  const snPo = `${TAG}PO1`;
  const po1 = await prisma.$transaction(async (tx) => {
    const sns = parseSerials(snPo);
    await assertTrackedSerialCount(tx, hdd.id, 1, sns, "入库");
    const doc = await tx.purchaseReceipt.create({
      data: {
        docNo: await nextDocNo(tx, "PO"),
        supplierId: supplier.id,
        remark: `${TAG}第一次入库`,
        lines: { create: [{ productId: hdd.id, qty: d(1), cost: d(240), serialsJson: JSON.stringify(sns), purchaseWarrantyMonths: 12 }] },
      },
    });
    await applyStock(tx, { productId: hdd.id, qtyDelta: 1, refType: "purchaseReceipt", refId: doc.id, refNo: doc.docNo });
    await inboundSerials(tx, {
      productId: hdd.id,
      sns,
      supplierId: supplier.id,
      purchaseWarranty: addMonths(doc.bizDate, 12),
      purchaseDocNo: doc.docNo,
    });
    return tx.purchaseReceipt.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });
  check((await st(snPo)) === "in_stock", "入库后应在库");

  await prisma.$transaction(async (tx) => {
    await voidInboundSerials(tx, [snPo]);
    await applyStock(tx, { productId: hdd.id, qtyDelta: -1, refType: "purchaseReceiptVoid", refId: po1.id, refNo: po1.docNo });
    await tx.purchaseReceipt.update({ where: { id: po1.id }, data: { status: "voided", voidedAt: new Date() } });
  });
  check((await st(snPo)) === null, "作废入库后 SN 档案应删除");

  const po2 = await prisma.$transaction(async (tx) => {
    const sns = [snPo];
    const doc = await tx.purchaseReceipt.create({
      data: {
        docNo: await nextDocNo(tx, "PO"),
        supplierId: supplier.id,
        remark: `${TAG}再入库同一码`,
        lines: { create: [{ productId: hdd.id, qty: d(1), cost: d(240), serialsJson: JSON.stringify(sns), purchaseWarrantyMonths: 12 }] },
      },
    });
    await applyStock(tx, { productId: hdd.id, qtyDelta: 1, refType: "purchaseReceipt", refId: doc.id, refNo: doc.docNo });
    await inboundSerials(tx, { productId: hdd.id, sns, supplierId: supplier.id, purchaseDocNo: doc.docNo });
    return tx.purchaseReceipt.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });
  check((await st(snPo)) === "in_stock", "同一码应能再入库");

  const so = await prisma.$transaction(async (tx) => {
    const sns = [snPo];
    await assertTrackedSerialCount(tx, hdd.id, 1, sns, "出库");
    const doc = await tx.salesOrder.create({
      data: {
        docNo: await nextDocNo(tx, "SO"),
        customerId: customer.id,
        settlement: "cash",
        remark: `${TAG}卖出`,
        materialAmt: d(329),
        totalAmt: d(329),
        lines: { create: [{ productId: hdd.id, qty: d(1), price: d(329), amount: d(329), isStocked: true, serialsJson: JSON.stringify(sns), saleWarrantyMonths: 12 }] },
      },
    });
    await applyStock(tx, { productId: hdd.id, qtyDelta: -1, refType: "salesOrder", refId: doc.id, refNo: doc.docNo });
    await outboundSerials(tx, { sns, status: "sold", customerId: customer.id, saleDocNo: doc.docNo });
    return tx.salesOrder.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });
  check((await st(snPo)) === "sold", "销售后应为已售");

  let voidPoBlocked = "";
  try {
    await prisma.$transaction(async (tx) => {
      await voidInboundSerials(tx, [snPo]);
    });
  } catch (e) {
    voidPoBlocked = e instanceof Error ? e.message : String(e);
  }
  check(voidPoBlocked.includes("不能作废"), `已售时作废入库应拒绝：${voidPoBlocked}`);

  const sr = await prisma.$transaction(async (tx) => {
    const line = await tx.salesOrderLine.findFirstOrThrow({ where: { headerId: so.id } });
    const sns = [snPo];
    await assertTrackedSerialCount(tx, hdd.id, 1, sns, "退货");
    const doc = await tx.salesReturn.create({
      data: {
        docNo: await nextDocNo(tx, "SR"),
        customerId: customer.id,
        salesOrderId: so.id,
        remark: `${TAG}退货`,
        totalAmt: d(329),
        lines: { create: [{ salesOrderLineId: line.id, productId: hdd.id, qty: d(1), amount: d(329), serialsJson: JSON.stringify(sns) }] },
      },
    });
    await tx.salesOrderLine.update({ where: { id: line.id }, data: { returnedQty: d(1) } });
    await applyStock(tx, { productId: hdd.id, qtyDelta: 1, refType: "salesReturn", refId: doc.id, refNo: doc.docNo });
    await returnSerials(tx, sns);
    return tx.salesReturn.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });
  check((await st(snPo)) === "returned", "退货后应为已退回");

  await prisma.$transaction(async (tx) => {
    const line = await tx.salesOrderLine.findFirstOrThrow({ where: { headerId: so.id } });
    await tx.salesOrderLine.update({ where: { id: line.id }, data: { returnedQty: d(0) } });
    await applyStock(tx, { productId: hdd.id, qtyDelta: -1, refType: "salesReturnVoid", refId: sr.id, refNo: sr.docNo });
    await restoreOutboundSerials(tx, {
      sns: [snPo],
      status: "sold",
      customerId: customer.id,
      saleDocNo: so.docNo,
    });
    await tx.salesReturn.update({ where: { id: sr.id }, data: { status: "voided", voidedAt: new Date() } });
  });
  const after = await prisma.serialNumber.findUnique({ where: { sn: snPo } });
  check(after?.status === "sold", `退货作废后应已售，实际 ${after?.status}`);
  check(after?.saleDocNo === so.docNo, "退货作废应写回原销售单号");

  await prisma.$transaction(async (tx) => {
    const line = await tx.salesOrderLine.findFirstOrThrow({ where: { headerId: so.id } });
    await tx.salesOrderLine.update({ where: { id: line.id }, data: { returnedQty: d(1) } });
    await applyStock(tx, { productId: hdd.id, qtyDelta: 1, refType: "salesReturn", refId: sr.id, refNo: sr.docNo });
    await returnSerials(tx, [snPo]);
  });

  const snOi = `${TAG}OI1`;
  let otherMiss = "";
  try {
    await prisma.$transaction(async (tx) => {
      await assertTrackedSerialCount(tx, hdd.id, 1, [], "入库");
    });
  } catch (e) {
    otherMiss = e instanceof Error ? e.message : String(e);
  }
  check(otherMiss.includes("管唯一 SN"), `其它入库漏码应拒绝：${otherMiss}`);

  await prisma.$transaction(async (tx) => {
    const doc = await tx.otherReceipt.create({
      data: {
        docNo: await nextDocNo(tx, "OI"),
        remark: TAG,
        lines: { create: [{ productId: hdd.id, qty: d(1), cost: d(1), serialsJson: JSON.stringify([snOi]) }] },
      },
    });
    await assertTrackedSerialCount(tx, hdd.id, 1, [snOi], "入库");
    await applyStock(tx, { productId: hdd.id, qtyDelta: 1, refType: "otherReceipt", refId: doc.id, refNo: doc.docNo });
    await inboundSerials(tx, { productId: hdd.id, sns: [snOi], purchaseDocNo: doc.docNo });
    await tx.otherReceipt.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
    await voidInboundSerials(tx, [snOi]);
    await applyStock(tx, { productId: hdd.id, qtyDelta: -1, refType: "otherReceiptVoid", refId: doc.id, refNo: doc.docNo });
    await tx.otherReceipt.update({ where: { id: doc.id }, data: { status: "voided", voidedAt: new Date() } });
  });
  check((await st(snOi)) === null, "作废其它入库应删 SN");

  const snOo = `${TAG}OO1`;
  await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseReceipt.create({
      data: {
        docNo: await nextDocNo(tx, "PO"),
        supplierId: supplier.id,
        remark: TAG,
        lines: { create: [{ productId: hdd.id, qty: d(1), cost: d(240), serialsJson: JSON.stringify([snOo]), purchaseWarrantyMonths: 12 }] },
      },
    });
    await applyStock(tx, { productId: hdd.id, qtyDelta: 1, refType: "purchaseReceipt", refId: po.id, refNo: po.docNo });
    await inboundSerials(tx, { productId: hdd.id, sns: [snOo], supplierId: supplier.id, purchaseDocNo: po.docNo });
    await tx.purchaseReceipt.update({ where: { id: po.id }, data: { status: "submitted", submittedAt: new Date() } });
    const oo = await tx.otherIssue.create({
      data: {
        docNo: await nextDocNo(tx, "OO"),
        reason: "scrap",
        remark: TAG,
        lines: { create: [{ productId: hdd.id, qty: d(1), serialsJson: JSON.stringify([snOo]) }] },
      },
    });
    await applyStock(tx, { productId: hdd.id, qtyDelta: -1, refType: "otherIssue", refId: oo.id, refNo: oo.docNo });
    await outboundSerials(tx, { sns: [snOo], status: "scrapped", saleDocNo: oo.docNo });
    await tx.otherIssue.update({ where: { id: oo.id }, data: { status: "submitted", submittedAt: new Date() } });
    check((await tx.serialNumber.findUnique({ where: { sn: snOo } }))?.status === "scrapped", "其它出库应为报废");
    await applyStock(tx, { productId: hdd.id, qtyDelta: 1, refType: "otherIssueVoid", refId: oo.id, refNo: oo.docNo });
    await restockSerials(tx, [snOo]);
    await tx.otherIssue.update({ where: { id: oo.id }, data: { status: "voided", voidedAt: new Date() } });
  });
  check((await st(snOo)) === "in_stock", "作废其它出库应回在库");

  const notes = { tag: TAG, customerId: customer.id, soNo: so.docNo, po2No: po2.docNo, fails };
  if (fails.length) {
    console.error(JSON.stringify({ ok: false, notes }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, notes }, null, 2));
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
