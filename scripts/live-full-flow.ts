/**
 * 全流程写入系统（不清库）。资料名带【全测】+时间戳。
 * 用法：npx tsx scripts/live-full-flow.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { d } from "../src/lib/money";
import { nextDocNo } from "../src/lib/numbering";
import { applyStock, inboundSerials, outboundSerials, parseSerials } from "../src/lib/stock";
import { createAr, voidAr } from "../src/lib/ar";
import { addTimeline } from "../src/lib/timeline";
import { addMonths, assertDraft, assertSettlement, assertSubmitted } from "../src/lib/guards";
import { postReceiptInTx } from "../src/lib/receipt-post";
import { openPurchaseRequest } from "../src/lib/purchase-request";
import { describeArPicks } from "../src/lib/ar-display";
import { monthlyPeriod } from "../src/lib/periods";
import { voidSales } from "../src/actions/sales";
import { submitWorkOrder } from "../src/actions/service";

const TAG = `【全测${new Date().toISOString().slice(5, 16).replace(/[-T:]/g, "")}】`;
const fails: string[] = [];
const notes: Record<string, unknown> = { tag: TAG };

function check(ok: boolean, msg: string) {
  if (!ok) fails.push(msg);
}

async function run() {
  try {
    assertSettlement({ isWalkIn: true }, "monthly");
    check(false, "散客月结应被拒绝");
  } catch (e) {
    notes.walkinMonthlyRejected = e instanceof Error ? e.message : String(e);
  }

  const leaf =
    (await prisma.productCategory.findFirst({ where: { name: { contains: "内存" }, parentId: { not: null } } })) ??
    (await prisma.productCategory.findFirst({ where: { parentId: { not: null } } })) ??
    (await prisma.productCategory.findFirst());
  if (!leaf) throw new Error("没有商品分类");
  const kbCat = await prisma.knowledgeCategory.findFirst({ orderBy: { sort: "asc" } });
  if (!kbCat) throw new Error("没有知识分类");

  const nCust = await prisma.customer.count();
  const monthly = await prisma.customer.create({
    data: {
      code: `C${String(nCust + 1).padStart(4, "0")}`,
      name: `${TAG}月结单位`,
      contactName: "全测会计",
      phone: "13800001212",
      address: "全测路 1 号",
      isWalkIn: false,
      settlement: "monthly",
      needInvoice: true,
      invoiceTitle: `${TAG}月结单位`,
      taxNo: "91440101LIVE1212X",
      invoiceBank: "全测银行",
      invoiceAccount: "62220000001212",
      invoiceAddress: "全测路 1 号",
      invoicePhone: "13800001212",
      sites: { create: [{ name: "总部机房", address: "全测路 1 号" }] },
    },
  });
  const walkin = await prisma.customer.create({
    data: {
      code: `C${String(nCust + 2).padStart(4, "0")}`,
      name: `${TAG}散客`,
      isWalkIn: true,
      settlement: "cash",
    },
  });
  const site = await prisma.site.findFirstOrThrow({ where: { customerId: monthly.id } });

  const supplier = await prisma.supplier.create({
    data: { name: `${TAG}批发`, contactName: "全测供", phone: "13900001212", remark: TAG },
  });

  const nProd = await prisma.product.count();
  const ram = await prisma.product.create({
    data: {
      code: `P${String(nProd + 1).padStart(4, "0")}`,
      name: `${TAG}金士顿条`,
      brand: "金士顿",
      spec: "16G DDR4 全测",
      unit: "条",
      category: leaf.name,
      categoryId: leaf.id,
      isStocked: true,
      canBeBuildPart: true,
      salePrice: d(199),
      lastCost: d(110),
      remark: TAG,
    },
  });
  const hdd = await prisma.product.create({
    data: {
      code: `P${String(nProd + 2).padStart(4, "0")}`,
      name: `${TAG}希捷硬盘`,
      brand: "希捷",
      spec: "1TB 管SN",
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
  const visit = await prisma.product.create({
    data: {
      code: `P${String(nProd + 3).padStart(4, "0")}`,
      name: `${TAG}上门费`,
      unit: "次",
      category: leaf.name,
      categoryId: leaf.id,
      isStocked: false,
      trackSerial: false,
      canBeBuildPart: false,
      salePrice: d(80),
      remark: TAG,
    },
  });
  const disposable = await prisma.product.create({
    data: {
      code: `P${String(nProd + 4).padStart(4, "0")}`,
      name: `${TAG}可删样品`,
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

  const kb = await prisma.knowledgeArticle.create({
    data: {
      code: `KB${Date.now().toString(36).toUpperCase()}`,
      title: `${TAG}开机报警`,
      categoryId: kbCat.id,
      symptoms: "嘀嘀响",
      solution: "拔内存重插",
      tags: "全测",
    },
  });
  await prisma.knowledgeArticle.update({
    where: { id: kb.id },
    data: { title: `${TAG}开机报警（已改）`, solution: "清金手指再插" },
  });

  const sn1 = `SN${Date.now()}A`;
  const sn2 = `SN${Date.now()}B`;

  const po = await prisma.$transaction(async (tx) => {
    const doc = await tx.purchaseReceipt.create({
      data: {
        docNo: await nextDocNo(tx, "PO"),
        supplierId: supplier.id,
        remark: `${TAG}入库`,
        lines: {
          create: [
            { productId: ram.id, qty: d(20), cost: d(108), serialsJson: "[]", purchaseWarrantyMonths: 12 },
            {
              productId: hdd.id,
              qty: d(2),
              cost: d(240),
              serialsJson: JSON.stringify([sn1, sn2]),
              purchaseWarrantyMonths: 12,
            },
          ],
        },
      },
      include: { lines: true },
    });
    for (const line of doc.lines) {
      const product = await tx.product.findUniqueOrThrow({ where: { id: line.productId } });
      const sns = parseSerials(line.serialsJson);
      if (product.trackSerial && sns.length !== Number(line.qty)) throw new Error("SN条数不对");
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
    }
    return tx.purchaseReceipt.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const soCash = await prisma.$transaction(async (tx) => {
    const amt = d(199);
    const doc = await tx.salesOrder.create({
      data: {
        docNo: await nextDocNo(tx, "SO"),
        customerId: walkin.id,
        settlement: "cash",
        remark: `${TAG}散客现卖内存`,
        materialAmt: amt,
        totalAmt: amt,
        lines: {
          create: [{ productId: ram.id, qty: d(1), price: amt, amount: amt, isStocked: true, serialsJson: "[]", saleWarrantyMonths: 12 }],
        },
      },
    });
    await applyStock(tx, { productId: ram.id, qtyDelta: d(-1), refType: "salesOrder", refId: doc.id, refNo: doc.docNo });
    const ar = await createAr(tx, {
      customerId: walkin.id,
      sourceType: "salesOrder",
      sourceId: doc.id,
      sourceNo: doc.docNo,
      bizDate: doc.bizDate,
      settlement: "cash",
      materialAmt: amt,
      serviceAmt: 0,
    });
    if (ar) {
      await postReceiptInTx(tx, {
        customerId: walkin.id,
        method: "wechat",
        remark: `销售 ${doc.docNo} 当场收款`,
        lines: [{ arEntryId: ar.id, amount: ar.totalAmt }],
      });
    }
    await addTimeline(tx, {
      customerId: walkin.id,
      eventType: "销售",
      refType: "salesOrder",
      refId: doc.id,
      refNo: doc.docNo,
      summary: `销售开单 ${doc.docNo}`,
      amount: amt,
    });
    return tx.salesOrder.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const soMonth = await prisma.$transaction(async (tx) => {
    const amt = d(189).mul(2);
    const created = await tx.salesOrder.create({
      data: {
        docNo: await nextDocNo(tx, "SO"),
        customerId: monthly.id,
        settlement: "monthly",
        remark: `${TAG}月结草稿`,
        needInvoice: true,
        invoiceType: "special",
        materialAmt: amt,
        totalAmt: amt,
        lines: {
          create: [{ productId: ram.id, qty: d(2), price: d(189), amount: amt, isStocked: true, serialsJson: "[]", saleWarrantyMonths: 12 }],
        },
      },
    });
    assertDraft(created.status);
    const doc = await tx.salesOrder.findUniqueOrThrow({ where: { id: created.id }, include: { lines: true, customer: true } });
    assertSettlement(doc.customer, doc.settlement);
    for (const line of doc.lines) {
      await applyStock(tx, { productId: line.productId, qtyDelta: d(line.qty).neg(), refType: "salesOrder", refId: doc.id, refNo: doc.docNo });
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

  let reopenBlocked = false;
  try {
    assertDraft(soMonth.status);
  } catch {
    reopenBlocked = true;
  }
  check(reopenBlocked, "已完成销售单应不能当草稿改");

  await prisma.$transaction(async (tx) => {
    const doc = await tx.salesOrder.findUniqueOrThrow({ where: { id: soMonth.id }, include: { lines: true } });
    assertSubmitted(doc.status);
    await voidAr(tx, "salesOrder", doc.id);
    for (const line of doc.lines) {
      if (!line.isStocked) continue;
      await applyStock(tx, { productId: line.productId, qtyDelta: line.qty, refType: "salesOrderVoid", refId: doc.id, refNo: doc.docNo });
    }
    await tx.salesOrder.update({ where: { id: doc.id }, data: { status: "voided", voidedAt: new Date() } });
  });
  const voided = await prisma.salesOrder.findUniqueOrThrow({ where: { id: soMonth.id } });
  let editAfterVoid = "";
  try {
    assertDraft(voided.status);
  } catch (e) {
    editAfterVoid = e instanceof Error ? e.message : String(e);
  }
  check(!!editAfterVoid, "作废后应不能改原单");

  const soKeep = await prisma.$transaction(async (tx) => {
    const amt = d(189);
    const created = await tx.salesOrder.create({
      data: {
        docNo: await nextDocNo(tx, "SO"),
        customerId: monthly.id,
        settlement: "monthly",
        remark: `${TAG}作废后重开 金士顿×1`,
        needInvoice: true,
        invoiceType: "special",
        materialAmt: amt,
        totalAmt: amt,
        lines: {
          create: [{ productId: ram.id, qty: d(1), price: amt, amount: amt, isStocked: true, serialsJson: "[]", saleWarrantyMonths: 12 }],
        },
      },
    });
    await applyStock(tx, { productId: ram.id, qtyDelta: d(-1), refType: "salesOrder", refId: created.id, refNo: created.docNo });
    await createAr(tx, {
      customerId: monthly.id,
      sourceType: "salesOrder",
      sourceId: created.id,
      sourceNo: created.docNo,
      bizDate: created.bizDate,
      settlement: "monthly",
      materialAmt: amt,
      serviceAmt: 0,
    });
    return tx.salesOrder.update({ where: { id: created.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const soSn = await prisma.$transaction(async (tx) => {
    const amt = d(329);
    const created = await tx.salesOrder.create({
      data: {
        docNo: await nextDocNo(tx, "SO"),
        customerId: monthly.id,
        settlement: "monthly",
        remark: `${TAG}卖管SN硬盘`,
        materialAmt: amt,
        totalAmt: amt,
        lines: {
          create: [
            {
              productId: hdd.id,
              qty: d(1),
              price: amt,
              amount: amt,
              isStocked: true,
              serialsJson: JSON.stringify([sn1]),
              saleWarrantyMonths: 12,
            },
          ],
        },
      },
    });
    await applyStock(tx, { productId: hdd.id, qtyDelta: d(-1), refType: "salesOrder", refId: created.id, refNo: created.docNo });
    await outboundSerials(tx, { sns: [sn1], status: "sold", customerId: monthly.id, saleDocNo: created.docNo });
    await createAr(tx, {
      customerId: monthly.id,
      sourceType: "salesOrder",
      sourceId: created.id,
      sourceNo: created.docNo,
      bizDate: created.bizDate,
      settlement: "monthly",
      materialAmt: amt,
      serviceAmt: 0,
    });
    return tx.salesOrder.update({ where: { id: created.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const soShortage = await prisma.salesOrder.create({
    data: {
      docNo: await nextDocNo(prisma, "SO"),
      customerId: monthly.id,
      settlement: "monthly",
      remark: `${TAG}故意缺货`,
      status: "draft",
      materialAmt: d(199).mul(999),
      totalAmt: d(199).mul(999),
      lines: {
        create: [{ productId: ram.id, qty: d(999), price: d(199), amount: d(199).mul(999), isStocked: true, serialsJson: "[]", saleWarrantyMonths: 12 }],
      },
    },
  });
  try {
    await prisma.$transaction(async (tx) => {
      await applyStock(tx, {
        productId: ram.id,
        qtyDelta: d(-999),
        refType: "salesOrder",
        refId: soShortage.id,
        refNo: soShortage.docNo,
      });
    });
    check(false, "超卖应库存不足");
  } catch (e) {
    notes.shortageError = e instanceof Error ? e.message : String(e);
    const prNo = await openPurchaseRequest("salesOrder", soShortage.id, soShortage.docNo, [{ productId: ram.id, qty: "999" }]);
    notes.purchaseRequestNo = prNo;
  }

  const ct = await prisma.$transaction(async (tx) => {
    const created = await tx.contract.create({
      data: {
        docNo: await nextDocNo(tx, "CT"),
        customerId: monthly.id,
        title: `${TAG}门店监控安装`,
        amount: d(8000),
        settlement: "monthly",
        needInvoice: true,
        invoiceType: "plain",
        remark: `${TAG}合同`,
        schedules: { create: [{ name: "开工款", amount: d(4000) }, { name: "验收款", amount: d(4000) }] },
      },
    });
    await createAr(tx, {
      customerId: monthly.id,
      sourceType: "contract",
      sourceId: created.id,
      sourceNo: created.docNo,
      bizDate: created.signDate,
      settlement: "monthly",
      materialAmt: 0,
      serviceAmt: created.amount,
    });
    return tx.contract.update({ where: { id: created.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const project = await prisma.project.create({
    data: { docNo: await nextDocNo(prisma, "PJ"), contractId: ct.id, name: `${TAG}总部监控工程`, siteId: site.id },
  });

  const woOnProject = await prisma.$transaction(async (tx) => {
    const ramAmt = d(199);
    const doc = await tx.workOrder.create({
      data: {
        docNo: await nextDocNo(tx, "WO"),
        customerId: monthly.id,
        siteId: site.id,
        projectId: project.id,
        visitType: "onsite",
        processNote: "按合同布线装摄像头，材料走合同不另计应收",
        nextAdvice: "等验收",
        settlement: "monthly",
        materialAmt: ramAmt,
        serviceAmt: d(0),
        billableAmt: d(0),
        lines: {
          create: [{ productId: ram.id, qty: d(1), price: ramAmt, amount: ramAmt, isStocked: true, isContractExtra: false, serialsJson: "[]" }],
        },
        labors: { create: [{ name: "临时小周", workDate: new Date(), days: d(1), dayRate: d(280), amount: d(280) }] },
      },
    });
    await applyStock(tx, { productId: ram.id, qtyDelta: d(-1), refType: "workOrder", refId: doc.id, refNo: doc.docNo });
    if (d(doc.billableAmt).greaterThan(0)) {
      await createAr(tx, {
        customerId: monthly.id,
        sourceType: "workOrder",
        sourceId: doc.id,
        sourceNo: doc.docNo,
        bizDate: doc.bizDate,
        settlement: "monthly",
        materialAmt: ramAmt,
        serviceAmt: 0,
      });
    }
    return tx.workOrder.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });
  const woProjAr = await prisma.arEntry.findFirst({ where: { sourceType: "workOrder", sourceId: woOnProject.id, voided: false } });
  check(!woProjAr, "合同内工单材料不应再记客户应收");

  const woExtra = await prisma.$transaction(async (tx) => {
    const extraAmt = d(329);
    const doc = await tx.workOrder.create({
      data: {
        docNo: await nextDocNo(tx, "WO"),
        customerId: monthly.id,
        siteId: site.id,
        projectId: project.id,
        visitType: "onsite",
        processNote: "客户要求加装一块硬盘，合同外增项",
        settlement: "monthly",
        materialAmt: extraAmt,
        serviceAmt: d(0),
        billableAmt: extraAmt,
        lines: {
          create: [
            {
              productId: hdd.id,
              qty: d(1),
              price: extraAmt,
              amount: extraAmt,
              isStocked: true,
              isContractExtra: true,
              serialsJson: JSON.stringify([sn2]),
            },
          ],
        },
      },
    });
    await applyStock(tx, { productId: hdd.id, qtyDelta: d(-1), refType: "workOrder", refId: doc.id, refNo: doc.docNo });
    await outboundSerials(tx, {
      sns: [sn2],
      status: "installed",
      customerId: monthly.id,
      siteId: site.id,
      saleDocNo: doc.docNo,
    });
    await createAr(tx, {
      customerId: monthly.id,
      sourceType: "workOrder",
      sourceId: doc.id,
      sourceNo: doc.docNo,
      bizDate: doc.bizDate,
      settlement: "monthly",
      materialAmt: extraAmt,
      serviceAmt: 0,
    });
    return tx.workOrder.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const woSpot = await prisma.$transaction(async (tx) => {
    const vis = d(80);
    const ramAmt = d(199);
    const billable = vis.add(ramAmt);
    const doc = await tx.workOrder.create({
      data: {
        docNo: await nextDocNo(tx, "WO"),
        customerId: monthly.id,
        siteId: site.id,
        visitType: "onsite",
        processNote: "零星上门查网，换一条内存",
        nextAdvice: "一周回访",
        settlement: "monthly",
        materialAmt: ramAmt,
        serviceAmt: vis,
        billableAmt: billable,
        lines: {
          create: [
            { productId: visit.id, qty: d(1), price: vis, amount: vis, isStocked: false, serialsJson: "[]" },
            { productId: ram.id, qty: d(1), price: ramAmt, amount: ramAmt, isStocked: true, serialsJson: "[]" },
          ],
        },
      },
    });
    await applyStock(tx, { productId: ram.id, qtyDelta: d(-1), refType: "workOrder", refId: doc.id, refNo: doc.docNo });
    await createAr(tx, {
      customerId: monthly.id,
      sourceType: "workOrder",
      sourceId: doc.id,
      sourceNo: doc.docNo,
      bizDate: doc.bizDate,
      settlement: "monthly",
      materialAmt: ramAmt,
      serviceAmt: vis,
    });
    return tx.workOrder.update({ where: { id: doc.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const build = await prisma.$transaction(async (tx) => {
    const labor = d(150);
    const part = d(199);
    const cfg = await tx.buildConfig.create({
      data: {
        docNo: await nextDocNo(tx, "CFG"),
        customerId: monthly.id,
        modelName: `${TAG}办公主机`,
        laborFee: labor,
        remark: TAG,
        lines: { create: [{ productId: ram.id, slot: "内存", qty: d(1), price: part, amount: part, serialsJson: "[]" }] },
      },
    });
    await applyStock(tx, { productId: ram.id, qtyDelta: d(-1), refType: "buildConfig", refId: cfg.id, refNo: cfg.docNo });
    const so = await tx.salesOrder.create({
      data: {
        docNo: await nextDocNo(tx, "SO"),
        customerId: monthly.id,
        settlement: "monthly",
        remark: `组装 ${cfg.docNo}`,
        buildConfigId: cfg.id,
        materialAmt: part,
        serviceAmt: labor,
        totalAmt: part.add(labor),
        lines: {
          create: [
            { productId: ram.id, qty: d(1), price: part, amount: part, isStocked: true, serialsJson: "[]", saleWarrantyMonths: 12 },
            { productId: visit.id, qty: d(1), price: labor, amount: labor, isStocked: false, serialsJson: "[]", saleWarrantyMonths: 0 },
          ],
        },
      },
    });
    await createAr(tx, {
      customerId: monthly.id,
      sourceType: "salesOrder",
      sourceId: so.id,
      sourceNo: so.docNo,
      bizDate: so.bizDate,
      settlement: "monthly",
      materialAmt: part,
      serviceAmt: labor,
    });
    await tx.salesOrder.update({ where: { id: so.id }, data: { status: "submitted", submittedAt: new Date() } });
    return tx.buildConfig.update({ where: { id: cfg.id }, data: { status: "submitted", submittedAt: new Date() } });
  });

  const ars = await prisma.arEntry.findMany({ where: { customerId: monthly.id, voided: false } });
  const openById = Object.fromEntries(ars.map((a) => [a.id, Number(a.totalAmt) - Number(a.receivedAmt)]));
  const views = await describeArPicks(ars, openById);
  const blank = views.filter((v) => !v.content.trim() || v.content === v.sourceNo);
  check(blank.length === 0, `应收摘要空白: ${blank.map((b) => b.sourceNo).join(",")}`);
  notes.arViews = views.map((v) => ({ no: v.sourceNo, type: v.typeLabel, content: v.content.slice(0, 80), open: v.open }));

  const keepAr = await prisma.arEntry.findFirstOrThrow({ where: { sourceId: soKeep.id, voided: false } });
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1, 15);
  await prisma.arEntry.update({ where: { id: keepAr.id }, data: { bizDate: lastMonth } });
  const { periodStart, periodEnd } = monthlyPeriod();
  const inPeriod = await prisma.arEntry.findMany({
    where: {
      customerId: monthly.id,
      settlement: "monthly",
      voided: false,
      statementId: null,
      bizDate: { gte: periodStart, lt: periodEnd },
    },
  });
  check(inPeriod.some((a) => a.id === keepAr.id), "回写上月日期后应对进月结期间");
  if (inPeriod.length) {
    const totalAmt = inPeriod.reduce((s, e) => s.add(e.totalAmt), d(0));
    const receivedAmt = inPeriod.reduce((s, e) => s.add(e.receivedAmt), d(0));
    const st = await prisma.statement.create({
      data: {
        docNo: await nextDocNo(prisma, "ST"),
        customerId: monthly.id,
        periodType: "monthly",
        periodStart,
        periodEnd,
        totalAmt,
        receivedAmt,
      },
    });
    await prisma.arEntry.updateMany({ where: { id: { in: inPeriod.map((e) => e.id) } }, data: { statementId: st.id } });
    notes.statementNo = st.docNo;
    const pay = await prisma.arEntry.findFirst({ where: { statementId: st.id, voided: false } });
    if (pay) {
      const open = d(pay.totalAmt).sub(pay.receivedAmt);
      if (open.greaterThan(0)) {
        await prisma.$transaction(async (tx) => {
          await postReceiptInTx(tx, {
            customerId: monthly.id,
            method: "transfer",
            remark: `${TAG}核销对账单`,
            lines: [{ arEntryId: pay.id, amount: open }],
          });
        });
      }
    }
  }

  const laborOnAr = await prisma.arEntry.findMany({ where: { customerId: monthly.id } });
  check(
    laborOnAr.every((a) => Number(a.totalAmt) !== 280),
    "临时工日薪不应单独进应收",
  );

  Object.assign(notes, {
    monthlyId: monthly.id,
    walkinId: walkin.id,
    ramId: ram.id,
    poNo: po.docNo,
    soCashNo: soCash.docNo,
    soVoidNo: soMonth.docNo,
    soKeepNo: soKeep.docNo,
    soSnNo: soSn.docNo,
    ctNo: ct.docNo,
    pjNo: project.docNo,
    woContractNo: woOnProject.docNo,
    woExtraNo: woExtra.docNo,
    woSpotNo: woSpot.docNo,
    cfgNo: build.docNo,
    kbId: kb.id,
    fails,
  });

  const soFromBuild = await prisma.salesOrder.findFirst({ where: { buildConfigId: build.id, status: "submitted" } });
  if (soFromBuild) {
    const vs = await voidSales(soFromBuild.id);
    check(!vs.ok && (vs.error || "").includes("组装"), `组装销售单单独作废应被拒绝，实际 ok=${vs.ok} error=${vs.error ?? ""}`);
  } else {
    check(false, "组装配置没有挂上销售单");
  }

  const prBefore = await prisma.purchaseRequest.count();
  const woWalk = await prisma.workOrder.create({
    data: {
      docNo: await nextDocNo(prisma, "WO"),
      customerId: walkin.id,
      settlement: "cash",
      processNote: `${TAG}散客缺货工单`,
      materialAmt: d(199).mul(50),
      billableAmt: d(199).mul(50),
      lines: {
        create: [
          {
            productId: ram.id,
            qty: d(50),
            price: d(199),
            amount: d(199).mul(50),
            isStocked: true,
            serialsJson: "[]",
          },
        ],
      },
    },
  });
  const woSub = await submitWorkOrder(woWalk.id);
  check(!woSub.ok && (woSub.error || "").includes("散客"), `散客工单缺货应拒绝待采购，实际 ${woSub.error ?? ""}`);
  const prAfter = await prisma.purchaseRequest.count();
  check(prAfter === prBefore, "散客工单缺货不应新增待采购");

  const foreignAr = await prisma.arEntry.findFirst({ where: { customerId: monthly.id, voided: false } });
  if (foreignAr) {
    try {
      await prisma.$transaction(async (tx) => {
        await postReceiptInTx(tx, {
          customerId: walkin.id,
          method: "cash",
          remark: `${TAG}跨客户核销应失败`,
          lines: [{ arEntryId: foreignAr.id, amount: 1 }],
        });
      });
      check(false, "跨客户核销应失败");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      check(msg.includes("其他客户"), `跨客户核销错误文案：${msg}`);
    }
  }

  Object.assign(notes, { fails });
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
