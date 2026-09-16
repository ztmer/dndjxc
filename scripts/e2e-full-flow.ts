/**
 * 全流程带数据：客户/供应商/月结发票/商品/知识库/入库/销售草稿改单/开单/作废。
 * 资料名带【E2E清】。跑完：npx tsx scripts/e2e-full-flow.ts --cleanup
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { d } from "../src/lib/money";
import { nextDocNo } from "../src/lib/numbering";
import { applyStock } from "../src/lib/stock";
import { createAr, voidAr } from "../src/lib/ar";
import { addTimeline } from "../src/lib/timeline";
import { assertDraft, assertSettlement, assertSubmitted } from "../src/lib/guards";

const TAG = "【E2E清】";

async function cleanup() {
  const customers = await prisma.customer.findMany({ where: { name: { contains: TAG } } });
  const cids = customers.map((c) => c.id);
  const suppliers = await prisma.supplier.findMany({ where: { name: { contains: TAG } } });
  const products = await prisma.product.findMany({
    where: { OR: [{ name: { contains: TAG } }, { remark: { contains: TAG } }] },
  });
  const pids = products.map((p) => p.id);

  if (cids.length) {
    await prisma.receipt.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.arEntry.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.timelineEvent.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.customerProductPrice.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.salesOrder.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.site.deleteMany({ where: { customerId: { in: cids } } });
    await prisma.customer.deleteMany({ where: { id: { in: cids } } });
  }
  if (suppliers.length) {
    const sids = suppliers.map((s) => s.id);
    await prisma.purchaseReceipt.deleteMany({ where: { supplierId: { in: sids } } });
    await prisma.supplier.deleteMany({ where: { id: { in: sids } } });
  }
  if (pids.length) {
    await prisma.stockLedger.deleteMany({ where: { productId: { in: pids } } });
    await prisma.stockBalance.deleteMany({ where: { productId: { in: pids } } });
    await prisma.serialNumber.deleteMany({ where: { productId: { in: pids } } });
    await prisma.customerProductPrice.deleteMany({ where: { productId: { in: pids } } });
    await prisma.product.deleteMany({ where: { id: { in: pids } } });
  }
  await prisma.knowledgeArticle.deleteMany({ where: { title: { contains: TAG } } });
}

async function run() {
  await cleanup();

  let walkinMonthlyRejected = "";
  try {
    assertSettlement({ isWalkIn: true }, "monthly");
  } catch (e) {
    walkinMonthlyRejected = e instanceof Error ? e.message : String(e);
  }

  const nCust = await prisma.customer.count();
  const customer = await prisma.customer.create({
    data: {
      code: `C${String(nCust + 1).padStart(4, "0")}`,
      name: `${TAG}月结开票客户`,
      contactName: "张会计",
      phone: "13800009112",
      address: "测试路 12 号",
      isWalkIn: false,
      settlement: "monthly",
      needInvoice: true,
      invoiceTitle: `${TAG}月结开票客户`,
      taxNo: "91440101E2E09112X",
      invoiceBank: "测试银行石湾支行",
      invoiceAccount: "6222000000009112",
      invoiceAddress: "测试路 12 号",
      invoicePhone: "13800009112",
      sites: { create: [{ name: "总部", address: "测试路 12 号" }] },
    },
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: `${TAG}批发商`,
      contactName: "刘采购",
      phone: "13900009112",
      address: "批发市场 A3",
      remark: TAG,
    },
  });

  const leaf =
    (await prisma.productCategory.findFirst({ where: { name: { contains: "内存" }, parentId: { not: null } } })) ??
    (await prisma.productCategory.findFirst({ where: { parentId: { not: null } } })) ??
    (await prisma.productCategory.findFirst());
  if (!leaf) throw new Error("没有商品分类");

  const nProd = await prisma.product.count();
  const sell = await prisma.product.create({
    data: {
      code: `P${String(nProd + 1).padStart(4, "0")}`,
      name: `${TAG}金士顿测试条`,
      brand: "金士顿",
      spec: "16G DDR4 测试",
      unit: "条",
      category: leaf.name,
      categoryId: leaf.id,
      isStocked: true,
      trackSerial: false,
      canBeBuildPart: true,
      salePrice: d(199),
      lastCost: d(110),
      remark: TAG,
    },
  });
  const disposable = await prisma.product.create({
    data: {
      code: `P${String(nProd + 2).padStart(4, "0")}`,
      name: `${TAG}可删样品`,
      brand: "测试",
      spec: "仅用于删除",
      unit: "个",
      category: leaf.name,
      categoryId: leaf.id,
      isStocked: true,
      salePrice: d(1),
      lastCost: d(1),
      remark: TAG,
    },
  });
  await prisma.product.delete({ where: { id: disposable.id } });

  const kbCat = await prisma.knowledgeCategory.findFirst({ orderBy: { sort: "asc" } });
  if (!kbCat) throw new Error("没有知识分类");
  const kb = await prisma.knowledgeArticle.create({
    data: {
      code: `KB${Date.now().toString(36).toUpperCase()}`,
      title: `${TAG}开机报警`,
      categoryId: kbCat.id,
      symptoms: "一开机嘀嘀响",
      solution: "先拔内存重插。",
      tags: "E2E,内存",
    },
  });
  await prisma.knowledgeArticle.update({
    where: { id: kb.id },
    data: { title: `${TAG}开机报警（已改）`, solution: "改过办法：清金手指再插。" },
  });
  const kbDel = await prisma.knowledgeArticle.create({
    data: {
      code: `KB${(Date.now() + 1).toString(36).toUpperCase()}`,
      title: `${TAG}待删条目`,
      categoryId: kbCat.id,
      symptoms: "占位",
      solution: "马上删",
    },
  });
  await prisma.knowledgeArticle.delete({ where: { id: kbDel.id } });

  const po = await prisma.$transaction(async (tx) => {
    const created = await tx.purchaseReceipt.create({
      data: {
        docNo: await nextDocNo(tx, "PO"),
        supplierId: supplier.id,
        remark: `${TAG}初稿 2 条`,
        lines: { create: [{ productId: sell.id, qty: d(2), cost: d(110), serialsJson: "[]", purchaseWarrantyMonths: 12 }] },
      },
    });
    assertDraft(created.status);
    await tx.purchaseReceiptLine.deleteMany({ where: { headerId: created.id } });
    await tx.purchaseReceipt.update({
      where: { id: created.id },
      data: {
        remark: `${TAG}改成 5 条再入库`,
        lines: { create: [{ productId: sell.id, qty: d(5), cost: d(108), serialsJson: "[]", purchaseWarrantyMonths: 12 }] },
      },
    });
    const doc = await tx.purchaseReceipt.findUniqueOrThrow({ where: { id: created.id }, include: { lines: true } });
    for (const line of doc.lines) {
      await applyStock(tx, {
        productId: line.productId,
        qtyDelta: line.qty,
        refType: "purchaseReceipt",
        refId: doc.id,
        refNo: doc.docNo,
      });
      await tx.product.update({ where: { id: line.productId }, data: { lastCost: line.cost } });
    }
    return tx.purchaseReceipt.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const so = await prisma.$transaction(async (tx) => {
    const created = await tx.salesOrder.create({
      data: {
        docNo: await nextDocNo(tx, "SO"),
        customerId: customer.id,
        settlement: "monthly",
        remark: `${TAG}草稿 1 条`,
        taxInclusive: true,
        needInvoice: true,
        invoiceType: "plain",
        materialAmt: d(199),
        totalAmt: d(199),
        lines: {
          create: [{ productId: sell.id, qty: d(1), price: d(199), amount: d(199), isStocked: true, serialsJson: "[]", saleWarrantyMonths: 12 }],
        },
      },
    });
    assertDraft(created.status);
    await tx.salesOrderLine.deleteMany({ where: { headerId: created.id } });
    const qty2 = d(2);
    const price2 = d(189);
    const amt2 = qty2.mul(price2);
    await tx.salesOrder.update({
      where: { id: created.id },
      data: {
        remark: `${TAG}改成 2 条专票`,
        invoiceType: "special",
        materialAmt: amt2,
        totalAmt: amt2,
        lines: {
          create: [{ productId: sell.id, qty: qty2, price: price2, amount: amt2, isStocked: true, serialsJson: "[]", saleWarrantyMonths: 12 }],
        },
      },
    });
    const doc = await tx.salesOrder.findUniqueOrThrow({ where: { id: created.id }, include: { lines: true, customer: true } });
    assertSettlement(doc.customer, doc.settlement);
    for (const line of doc.lines) {
      await applyStock(tx, {
        productId: line.productId,
        qtyDelta: d(line.qty).neg(),
        refType: "salesOrder",
        refId: doc.id,
        refNo: doc.docNo,
      });
    }
    await createAr(tx, {
      customerId: doc.customerId,
      sourceType: "salesOrder",
      sourceId: doc.id,
      sourceNo: doc.docNo,
      bizDate: doc.bizDate,
      settlement: doc.settlement,
      materialAmt: doc.materialAmt,
      serviceAmt: doc.serviceAmt,
    });
    await addTimeline(tx, {
      customerId: doc.customerId,
      eventType: "销售",
      refType: "salesOrder",
      refId: doc.id,
      refNo: doc.docNo,
      summary: `销售开单 ${doc.docNo}`,
      amount: doc.totalAmt,
    });
    return tx.salesOrder.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  let reopenWhileSubmittedBlocked = false;
  try {
    assertDraft(so.status);
  } catch {
    reopenWhileSubmittedBlocked = true;
  }

  await prisma.$transaction(async (tx) => {
    const doc = await tx.salesOrder.findUniqueOrThrow({ where: { id: so.id }, include: { lines: true } });
    assertSubmitted(doc.status);
    await voidAr(tx, "salesOrder", doc.id);
    for (const line of doc.lines) {
      if (!line.isStocked) continue;
      await applyStock(tx, {
        productId: line.productId,
        qtyDelta: line.qty,
        refType: "salesOrderVoid",
        refId: doc.id,
        refNo: doc.docNo,
      });
    }
    await addTimeline(tx, {
      customerId: doc.customerId,
      eventType: "销售",
      refType: "salesOrder",
      refId: doc.id,
      refNo: doc.docNo,
      summary: `销售作废 ${doc.docNo}`,
      amount: 0,
    });
    await tx.salesOrder.update({ where: { id: doc.id }, data: { status: "voided", voidedAt: new Date() } });
  });

  const voided = await prisma.salesOrder.findUniqueOrThrow({ where: { id: so.id } });
  let editAfterVoidError = "";
  try {
    assertDraft(voided.status);
  } catch (e) {
    editAfterVoidError = e instanceof Error ? e.message : String(e);
  }

  const so2 = await prisma.$transaction(async (tx) => {
    const amt = d(189);
    const created = await tx.salesOrder.create({
      data: {
        docNo: await nextDocNo(tx, "SO"),
        customerId: customer.id,
        settlement: "monthly",
        remark: `${TAG}作废后重开`,
        taxInclusive: true,
        needInvoice: true,
        invoiceType: "special",
        materialAmt: amt,
        totalAmt: amt,
        lines: {
          create: [{ productId: sell.id, qty: d(1), price: amt, amount: amt, isStocked: true, serialsJson: "[]", saleWarrantyMonths: 12 }],
        },
      },
    });
    await applyStock(tx, {
      productId: sell.id,
      qtyDelta: d(-1),
      refType: "salesOrder",
      refId: created.id,
      refNo: created.docNo,
    });
    await createAr(tx, {
      customerId: customer.id,
      sourceType: "salesOrder",
      sourceId: created.id,
      sourceNo: created.docNo,
      bizDate: created.bizDate,
      settlement: "monthly",
      materialAmt: amt,
      serviceAmt: 0,
    });
    await addTimeline(tx, {
      customerId: customer.id,
      eventType: "销售",
      refType: "salesOrder",
      refId: created.id,
      refNo: created.docNo,
      summary: `销售开单 ${created.docNo}`,
      amount: amt,
    });
    return tx.salesOrder.update({ where: { id: created.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const bal = await prisma.stockBalance.findFirst({ where: { productId: sell.id } });
  const ar = await prisma.arEntry.findMany({ where: { customerId: customer.id, voided: false } });

  console.log(
    JSON.stringify(
      {
        walkinMonthlyRejected,
        customerId: customer.id,
        supplierId: supplier.id,
        productId: sell.id,
        knowledgeKeptId: kb.id,
        purchaseId: po.id,
        purchaseNo: po.docNo,
        salesVoidedId: so.id,
        salesVoidedNo: so.docNo,
        salesNewId: so2.id,
        salesNewNo: so2.docNo,
        invoiceType: so2.invoiceType,
        needInvoice: so2.needInvoice,
        settlement: customer.settlement,
        taxNo: customer.taxNo,
        reopenWhileSubmittedBlocked,
        editAfterVoidError,
        stockQty: bal ? String(bal.qty) : null,
        openAr: ar.map((a) => ({ sourceNo: a.sourceNo, open: Number(a.totalAmt) - Number(a.receivedAmt) })),
      },
      null,
      2,
    ),
  );
}

const job = process.argv.includes("--cleanup") ? cleanup : run;
job()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
