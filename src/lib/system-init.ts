import { prisma } from "@/lib/prisma";
import { ensureProductCategories } from "@/lib/ensure-product-categories";
import { ensureProductBrands } from "@/lib/ensure-product-brands";
import { ensureKnowledge } from "@/lib/ensure-knowledge";
import { DEFAULT_TEMPLATES } from "@/lib/print";
import { defaultLayout, parseLayout } from "@/lib/report-layout";
import { paperForBiz } from "@/lib/report-formats";

export type InitStep = { name: string; detail: string };

/** 系统默认散客，初始化时唯一保留的客户档案。 */
export const SYSTEM_WALKIN_CODE = "C0001";

export type ResetScope = {
  /** 销售/工单/合同/采购/库存/串号/应收。不删客户、供应商、商品。 */
  documents?: boolean;
  /** 客户资料（只留系统散客 C0001）。有未清单据时必须同时勾 documents。 */
  customers?: boolean;
  /** 供应商资料。进货单上的供应商会摘掉。 */
  suppliers?: boolean;
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function wipeDocuments(tx: Tx) {
  await tx.receiptLine.deleteMany();
  await tx.receipt.deleteMany();
  await tx.arEntry.updateMany({ data: { statementId: null } });
  await tx.statement.deleteMany();
  await tx.arEntry.deleteMany();
  await tx.salesReturnLine.deleteMany();
  await tx.salesReturn.deleteMany();
  await tx.workOrderReturnLine.deleteMany();
  await tx.workOrderReturn.deleteMany();
  await tx.dayLabor.deleteMany();
  await tx.workOrderLine.deleteMany();
  await tx.workOrder.deleteMany();
  await tx.project.deleteMany();
  await tx.contractSchedule.deleteMany();
  await tx.contract.deleteMany();
  await tx.salesOrderLine.deleteMany();
  await tx.salesOrder.updateMany({ data: { buildConfigId: null } });
  await tx.salesOrder.deleteMany();
  await tx.buildConfigLine.deleteMany();
  await tx.buildConfig.deleteMany();
  await tx.purchaseRequestLine.deleteMany();
  await tx.purchaseRequest.deleteMany();
  await tx.purchaseReceiptLine.deleteMany();
  await tx.purchaseReceipt.deleteMany();
  await tx.otherReceiptLine.deleteMany();
  await tx.otherReceipt.deleteMany();
  await tx.otherIssueLine.deleteMany();
  await tx.otherIssue.deleteMany();
  await tx.stockLedger.deleteMany();
  await tx.stockBalance.deleteMany();
  await tx.serialNumber.deleteMany();
  await tx.timelineEvent.deleteMany();
  await tx.numberSeq.deleteMany();
}

async function wipeCustomers(tx: Tx) {
  const keep = await tx.customer.findMany({ where: { code: SYSTEM_WALKIN_CODE }, select: { id: true } });
  const keepIds = keep.map((c) => c.id);
  const otherCust = keepIds.length ? { customerId: { notIn: keepIds } } : {};
  await tx.timelineEvent.deleteMany({ where: otherCust });
  await tx.customerAsset.deleteMany({ where: otherCust });
  await tx.customerIpAddr.deleteMany({ where: otherCust });
  await tx.customerNetDevice.deleteMany({ where: otherCust });
  await tx.customerBroadband.deleteMany({ where: otherCust });
  await tx.customerWifi.deleteMany({ where: otherCust });
  await tx.customerProductPrice.deleteMany({ where: otherCust });
  await tx.site.deleteMany({ where: otherCust });
  if (keepIds.length) await tx.customer.deleteMany({ where: { id: { notIn: keepIds } } });
  else await tx.customer.deleteMany();
}

async function wipeSuppliers(tx: Tx) {
  await tx.serialNumber.updateMany({ data: { supplierId: null } });
  await tx.purchaseReceipt.updateMany({ data: { supplierId: null } });
  await tx.supplier.deleteMany();
}

const otherThanSystemWalkIn = { customer: { code: { not: SYSTEM_WALKIN_CODE } } };

async function leftoverCustomerDocs() {
  const [so, wo, ct, bc, rc, st, ar, sn, sr] = await Promise.all([
    prisma.salesOrder.count({ where: otherThanSystemWalkIn }),
    prisma.workOrder.count({ where: otherThanSystemWalkIn }),
    prisma.contract.count({ where: otherThanSystemWalkIn }),
    prisma.buildConfig.count({ where: otherThanSystemWalkIn }),
    prisma.receipt.count({ where: otherThanSystemWalkIn }),
    prisma.statement.count({ where: otherThanSystemWalkIn }),
    prisma.arEntry.count({ where: otherThanSystemWalkIn }),
    prisma.serialNumber.count({ where: otherThanSystemWalkIn }),
    prisma.salesReturn.count({ where: otherThanSystemWalkIn }),
  ]);
  return so + wo + ct + bc + rc + st + ar + sn + sr;
}

/** 按勾选清空。分类、品牌、知识库、本店商品、账号不删。 */
export async function resetBizData(scope: ResetScope = { documents: true, customers: true }): Promise<InitStep> {
  const documents = !!scope.documents;
  const customers = !!scope.customers;
  const suppliers = !!scope.suppliers;
  if (!documents && !customers && !suppliers) {
    throw new Error("请至少勾一项要清空的内容");
  }
  if (customers && !documents) {
    const n = await leftoverCustomerDocs();
    if (n) throw new Error("客户下还有单据，请同时勾「单据、库存、串号」");
  }

  const bits: string[] = [];
  await prisma.$transaction(
    async (tx) => {
      if (documents) {
        await wipeDocuments(tx);
        bits.push("单据/库存/串号");
      }
      if (customers) {
        await wipeCustomers(tx);
        bits.push("客户（只留系统散客 C0001）");
      }
      if (suppliers) {
        await wipeSuppliers(tx);
        bits.push("供应商");
      }
    },
    { timeout: 120000 },
  );
  return { name: "清空数据", detail: `${bits.join("、")}已清；分类/品牌/知识库/商品资料还在` };
}

/** 空店可开张：补默认公司/仓/散客/分类/品牌/知识库/打印模板。默认不删单据。 */
export async function runSafeSystemInit(opts?: { resetBiz?: boolean; reset?: ResetScope }): Promise<InitStep[]> {
  const steps: InitStep[] = [];
  const reset = opts?.reset ?? (opts?.resetBiz ? { documents: true, customers: true } : undefined);
  if (reset && (reset.documents || reset.customers || reset.suppliers)) {
    steps.push(await resetBizData(reset));
  }

  const company = await prisma.company.upsert({
    where: { id: "default" },
    create: { id: "default", name: "电脑店", phone: "" },
    update: {},
  });
  steps.push({ name: "公司", detail: company.name });

  const wh = await prisma.warehouse.upsert({
    where: { code: "STORE" },
    create: { code: "STORE", name: "门店仓", isDefault: true },
    update: { isDefault: true, name: "门店仓" },
  });
  steps.push({ name: "仓库", detail: `${wh.code} ${wh.name}` });

  const walkIn = await prisma.customer.upsert({
    where: { code: SYSTEM_WALKIN_CODE },
    create: { code: SYSTEM_WALKIN_CODE, name: "散客", isWalkIn: true, settlement: "cash", priceMemory: false },
    update: { isWalkIn: true, settlement: "cash", priceMemory: false },
  });
  steps.push({ name: "散客", detail: `${walkIn.code} ${walkIn.name}` });

  await ensureProductCategories();
  const catCount = await prisma.productCategory.count();
  steps.push({ name: "商品分类", detail: `${catCount} 条` });

  const outsrcCat = await prisma.productCategory.findUnique({ where: { code: "SVC-OUTSRC" } });
  const outsrc = await prisma.product.upsert({
    where: { code: "SVC-OUTSRC" },
    create: {
      code: "SVC-OUTSRC",
      name: "委外维修",
      spec: "客户配件送外厂维修（不扣本店库存）",
      unit: "次",
      category: "服务 / 委外维修",
      categoryId: outsrcCat?.id ?? null,
      isStocked: false,
      trackSerial: false,
      canBeBuildPart: false,
      salePrice: 0,
      lastCost: 0,
      saleWarrantyMonths: 0,
      purchaseWarrantyMonths: 0,
    },
    update: { isStocked: false, trackSerial: false, canBeBuildPart: false },
  });
  steps.push({ name: "委外维修商品", detail: `${outsrc.code} ${outsrc.name}` });

  await ensureProductBrands();
  const brandCount = await prisma.productBrand.count();
  steps.push({ name: "商品品牌", detail: `${brandCount} 条` });

  const kb = await ensureKnowledge();
  steps.push({ name: "知识库", detail: `${kb.categories} 类、${kb.articles} 条内置条目（店里自建的不删）` });

  let tpl = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const exists = await prisma.printTemplate.findFirst({ where: { bizType: t.bizType, name: t.name } });
    if (!exists) {
      await prisma.printTemplate.create({ data: { ...t, isDefault: true } });
      tpl += 1;
    }
  }
  steps.push({ name: "打印模板", detail: tpl ? `补了 ${tpl} 套` : "已有，未改" });

  let fmtAdded = 0;
  let fmtRefreshed = 0;
  for (const t of DEFAULT_TEMPLATES) {
    const exists = await prisma.reportFormat.findFirst({ where: { bizType: t.bizType, name: t.name } });
    if (!exists) {
      const hasDefault = await prisma.reportFormat.findFirst({ where: { bizType: t.bizType, isDefault: true } });
      await prisma.reportFormat.create({
        data: {
          bizType: t.bizType,
          name: t.name,
          html: t.html,
          configJson: JSON.stringify(defaultLayout(t.bizType)),
          isDefault: !hasDefault,
          paper: paperForBiz(t.bizType),
        },
      });
      fmtAdded += 1;
    } else {
      const next = JSON.stringify(parseLayout(exists.configJson, t.bizType));
      if (next !== exists.configJson) {
        await prisma.reportFormat.update({ where: { id: exists.id }, data: { configJson: next } });
        fmtRefreshed += 1;
      }
    }
  }
  const fmtDetail = [
    fmtAdded ? `补了 ${fmtAdded} 套` : "",
    fmtRefreshed ? `列宽刷新 ${fmtRefreshed} 套内置格式` : "",
  ]
    .filter(Boolean)
    .join("，");
  steps.push({ name: "报表格式", detail: fmtDetail || "已有，未改" });

  const users = await prisma.user.count();
  steps.push({ name: "账号", detail: users ? `${users} 个用户，未改密码` : "没有用户，请先建店主" });

  return steps;
}
