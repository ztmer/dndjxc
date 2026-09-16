import { prisma } from "@/lib/prisma";
import { money, qty } from "@/lib/money";
import { DOC_STATUS, INVOICE_TYPE, PAY_METHOD, SETTLEMENT, label } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { formatSerialsDisplay, parseSerials } from "@/lib/serials";
import { invoiceLabel } from "@/lib/job-flow";
import { amountInChinese, esc } from "@/lib/money-cn";
import { DEFAULT_TEMPLATES } from "@/lib/print-defaults";
import { describeArPicks, expandStatementDetailRows } from "@/lib/ar-display";
import { companyBrandDataUri } from "@/lib/company-brand-store";
import { statementPeriodLabel } from "@/lib/periods";
import { paperForBiz } from "@/lib/report-formats";
import { addMonths } from "@/lib/guards";

export { DEFAULT_TEMPLATES };

export async function shopInfo() {
  const c = await prisma.company.findUnique({ where: { id: "default" } });
  return {
    shop: esc(c?.name || "电脑店"),
    shopAddress: esc(c?.address || ""),
    shopPhone: esc(c?.phone || ""),
    shopTaxNo: esc(c?.taxNo || ""),
    shopBank: esc(c?.bank || ""),
    shopAccount: esc(c?.bankAccount || ""),
    shopLogo: await companyBrandDataUri(c?.logoFile || ""),
    shopSeal: await companyBrandDataUri(c?.sealFile || ""),
  };
}

export async function shopName() {
  const s = await shopInfo();
  return s.shop;
}

export function renderTemplate(html: string, data: Record<string, string>) {
  let out = html;
  for (const [k, v] of Object.entries(data)) {
    out = out.replaceAll(`{{${k}}}`, v ?? "");
  }
  return out;
}

export async function resolvePrintFormat(bizType: string, formatId?: string) {
  if (formatId) {
    const one = await prisma.reportFormat.findUnique({ where: { id: formatId } });
    if (one && one.bizType === bizType) return one;
  }
  const fromReport = await prisma.reportFormat.findFirst({ where: { bizType, isDefault: true } });
  if (fromReport) return fromReport;
  const fromOld = await prisma.printTemplate.findFirst({ where: { bizType, isDefault: true } });
  if (fromOld) return { ...fromOld, paper: paperForBiz(bizType), remark: "" };
  const builtin = DEFAULT_TEMPLATES.find((t) => t.bizType === bizType);
  if (!builtin) return null;
  return { ...builtin, id: "", paper: paperForBiz(bizType), remark: "", isDefault: true };
}

function watermark(status: string) {
  if (status === "draft") return "草稿";
  if (status === "voided") return "作废";
  return "";
}

function productTitle(p?: { brand: string; name: string; spec: string } | null) {
  if (!p) return "";
  const brand = (p.brand || "").trim();
  const model = (p.name || "").trim();
  const spec = (p.spec || "").trim();
  const main = brand && model ? (model.startsWith(brand) ? model : `${brand} ${model}`) : model || brand;
  return esc(spec ? `${main} ${spec}` : main);
}

export async function buildConfigPrintData(id: string, mode: "buildConfig" | "installSheet" = "buildConfig") {
  const doc = await prisma.buildConfig.findUnique({ where: { id }, include: { customer: true, lines: true } });
  if (!doc) throw new Error("配置单不存在");
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  const shop = await shopName();
  const part = doc.lines.reduce((s, l) => s + Number(l.amount), 0);
  const hideMoney = mode === "installSheet";
  const lines = hideMoney
    ? doc.lines
        .map(
          (l) =>
            `<tr><td>${esc(l.slot || "")}</td><td>${esc(pmap[l.productId]?.name || "")}</td><td>${esc(pmap[l.productId]?.unit || "")}</td><td>${qty(l.qty)}</td><td>${esc(formatSerialsDisplay(l.serialsJson))}</td></tr>`,
        )
        .join("")
    : doc.lines
        .map((l) => `<tr><td>${esc(pmap[l.productId]?.name || "")}</td><td>${esc(pmap[l.productId]?.unit || "")}</td><td>${qty(l.qty)}</td><td>${money(l.price)}</td><td>${money(l.amount)}</td></tr>`)
        .join("");
  return {
    shop,
    docNo: doc.docNo,
    customer: doc.customer.name,
    modelName: doc.modelName,
    unitSn: doc.unitSn || "—",
    labor: hideMoney ? "" : money(doc.laborFee),
    total: hideMoney ? "" : money(part + Number(doc.laborFee)),
    watermark: watermark(doc.status),
    remark: doc.remark || "",
    lines,
    rowsJson: JSON.stringify(
      doc.lines.map((l) => {
        const p = pmap[l.productId];
        return {
          slot: l.slot || "",
          name: p?.name ?? "",
          brand: p?.brand ?? "",
          spec: p?.spec ?? "",
          code: p?.code ?? "",
          unit: p?.unit ?? "",
          qty: qty(l.qty),
          serial: formatSerialsDisplay(l.serialsJson),
          ...(hideMoney ? {} : { price: money(l.price), amount: money(l.amount) }),
        };
      }),
    ),
  };
}

export async function salesPrintData(id: string) {
  const doc = await prisma.salesOrder.findUnique({
    where: { id },
    include: { customer: true, lines: true },
  });
  if (!doc) throw new Error("销售单不存在");
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  const shop = await shopInfo();
  const rows = doc.lines
    .map((l) => {
      const p = pmap[l.productId];
      return `<tr><td>${productTitle(p)}</td><td>${esc(p?.unit || "")}</td><td>${qty(l.qty)}</td><td>${money(l.price)}</td><td>${money(l.amount)}</td></tr>`;
    })
    .join("");
  const deliveryRows = doc.lines
    .map((l) => {
      const p = pmap[l.productId];
      return `<tr><td>${productTitle(p)}</td><td>${esc(p?.unit || "")}</td><td style="text-align:right">${qty(l.qty)}</td><td style="text-align:right">${money(l.price)}</td><td style="text-align:right">${money(l.amount)}</td><td>${esc(formatSerialsDisplay(l.serialsJson))}</td></tr>`;
    })
    .join("");
  const taxInvoice = `${doc.taxInclusive ? "含税" : "不含税"} · ${invoiceLabel(doc.needInvoice, doc.invoiceType)}`;
  return {
    ...shop,
    docNo: esc(doc.docNo),
    customer: esc(doc.customer.name),
    contact: esc(doc.customer.contactName || "—"),
    phone: esc(doc.customer.phone || "—"),
    address: esc(doc.customer.address || "—"),
    settlement: label(SETTLEMENT, doc.settlement),
    status: label(DOC_STATUS, doc.status),
    date: formatDate(doc.bizDate),
    total: money(doc.totalAmt),
    totalCn: amountInChinese(Number(doc.totalAmt)),
    watermark: watermark(doc.status),
    remark: esc(doc.remark || "无"),
    taxInvoice,
    lines: rows,
    deliveryLines: deliveryRows,
    rowsJson: JSON.stringify(
      doc.lines.map((l) => {
        const p = pmap[l.productId];
        const title = productTitle(p);
        return {
          name: title,
          brand: esc(p?.brand || ""),
          spec: esc(p?.spec || ""),
          code: esc(p?.code || ""),
          unit: esc(p?.unit || ""),
          qty: qty(l.qty),
          price: money(l.price),
          amount: money(l.amount),
          serial: esc(formatSerialsDisplay(l.serialsJson)),
          remark: "",
        };
      }),
    ),
  };
}

export async function statementPrintData(id: string) {
  const doc = await prisma.statement.findUnique({
    where: { id },
    include: { customer: true, arEntries: { where: { voided: false }, orderBy: { bizDate: "asc" } } },
  });
  if (!doc) throw new Error("对账单不存在");
  const shop = await shopInfo();
  const detailRows = await expandStatementDetailRows(doc.arEntries);
  const views = await describeArPicks(
    doc.arEntries,
    Object.fromEntries(doc.arEntries.map((a) => [a.id, Number(a.totalAmt) - Number(a.receivedAmt)])),
  );
  const viewById = Object.fromEntries(views.map((v) => [v.id, v]));
  let material = 0;
  let service = 0;
  const lines = doc.arEntries
    .map((a) => {
      material += Number(a.materialAmt);
      service += Number(a.serviceAmt);
      const open = Number(a.totalAmt) - Number(a.receivedAmt);
      const content = esc((viewById[a.id]?.content || viewById[a.id]?.title || "").replace(/\n/g, "；"));
      return `<tr><td>${formatDate(a.bizDate)}</td><td>${esc(a.sourceNo)}</td><td>${content}</td><td style="text-align:right">${money(a.materialAmt)}</td><td style="text-align:right">${money(a.serviceAmt)}</td><td style="text-align:right">${money(a.totalAmt)}</td><td style="text-align:right">${money(a.receivedAmt)}</td><td style="text-align:right">${money(open)}</td></tr>`;
    })
    .join("");
  const open = Number(doc.totalAmt) - Number(doc.receivedAmt);
  return {
    ...shop,
    docNo: esc(doc.docNo),
    customer: esc(doc.customer.name),
    contact: esc(doc.customer.contactName || "—"),
    phone: esc(doc.customer.phone || "—"),
    settlement: statementPeriodLabel(doc.periodType),
    period: `${formatDate(doc.periodStart)} 至 ${formatDate(doc.periodEnd)}`,
    total: money(doc.totalAmt),
    received: money(doc.receivedAmt),
    open: money(open),
    openCn: amountInChinese(open),
    material: money(material),
    service: money(service),
    printDate: formatDate(new Date()),
    lines,
    rowsJson: JSON.stringify(detailRows),
  };
}

export async function contractPrintData(id: string) {
  const doc = await prisma.contract.findUnique({
    where: { id },
    include: { customer: true, schedules: true },
  });
  if (!doc) throw new Error("合同不存在");
  const shop = await shopInfo();
  const c = doc.customer;
  const invoiceBits = [
    c.needInvoice || doc.needInvoice ? `抬头 ${c.invoiceTitle || c.name}` : "",
    c.taxNo ? `税号 ${c.taxNo}` : "",
    c.invoiceBank ? `开户行 ${c.invoiceBank} ${c.invoiceAccount}` : "",
  ].filter(Boolean);
  const invoiceText = doc.needInvoice
    ? `本单开具${label(INVOICE_TYPE, doc.invoiceType || "plain")}，资料以甲方档案为准`
    : "本单不开具发票";
  const schedules =
    doc.schedules.length === 0
      ? `<tr><td colspan="3">未拆分款项，按合同总额及结算周期支付</td></tr>`
      : doc.schedules
          .map(
            (s) =>
              `<tr><td>${esc(s.name)}</td><td style="text-align:right">${money(s.amount)}</td><td>${s.dueDate ? formatDate(s.dueDate) : "—"}</td></tr>`,
          )
          .join("");
  return {
    ...shop,
    docNo: esc(doc.docNo),
    title: esc(doc.title || "工程承包合同"),
    customer: esc(c.name),
    contact: esc(c.contactName || "—"),
    phone: esc(c.phone || "—"),
    address: esc(c.address || "—"),
    invoiceInfo: esc(invoiceBits.join("；") || "无"),
    invoiceText,
    taxText: doc.taxInclusive ? "价款为含税价" : "价款为不含税价，税金按约定另计",
    amount: money(doc.amount),
    amountCn: amountInChinese(Number(doc.amount)),
    settlement: label(SETTLEMENT, doc.settlement),
    duration: esc(doc.durationNote || "以双方现场确定为准"),
    remark: esc(doc.remark || "无"),
    warrantyMonths: String(doc.warrantyMonths),
    signDate: formatDate(doc.signDate),
    schedules,
    watermark: watermark(doc.status),
    rowsJson: JSON.stringify(
      doc.schedules.map((s) => ({
        name: esc(s.name),
        amount: money(s.amount),
        date: s.dueDate ? formatDate(s.dueDate) : "—",
      })),
    ),
  };
}

export async function receiptPrintData(id: string) {
  const doc = await prisma.receipt.findUnique({
    where: { id },
    include: { customer: true, lines: true },
  });
  if (!doc) throw new Error("收款单不存在");
  const ars = await prisma.arEntry.findMany({ where: { id: { in: doc.lines.map((l) => l.arEntryId) } } });
  const arMap = Object.fromEntries(ars.map((a) => [a.id, a]));
  const views = await describeArPicks(
    ars,
    Object.fromEntries(ars.map((a) => [a.id, Number(a.totalAmt) - Number(a.receivedAmt)])),
  );
  const viewById = Object.fromEntries(views.map((v) => [v.id, v]));
  const shop = await shopInfo();
  return {
    ...shop,
    docNo: esc(doc.docNo),
    customer: esc(doc.customer.name),
    phone: esc(doc.customer.phone || "—"),
    method: label(PAY_METHOD, doc.method),
    date: formatDate(doc.bizDate),
    amount: money(doc.amount),
    total: money(doc.amount),
    totalCn: amountInChinese(Number(doc.amount)),
    remark: esc(doc.remark || ""),
    watermark: watermark(doc.status),
    rowsJson: JSON.stringify(
      doc.lines.map((l) => {
        const ar = arMap[l.arEntryId];
        const v = viewById[l.arEntryId];
        return {
          sourceNo: esc(ar?.sourceNo || ""),
          date: ar ? formatDate(ar.bizDate) : "",
          content: esc((v?.content || v?.title || ar?.sourceNo || "").replace(/\n/g, "；")),
          name: esc(v?.title || ar?.sourceNo || ""),
          qty: "1",
          amount: money(l.amount),
          total: money(l.amount),
        };
      }),
    ),
  };
}

/** 保修箱贴：id 可以是唯一 SN 记录，也可以是销售单（一码一贴）。 */
export async function warrantyLabelPrintDatas(id: string): Promise<Record<string, string>[]> {
  const shop = await shopInfo();
  type SnRow = {
    sn: string;
    saleDocNo: string;
    soldAt: Date | null;
    saleWarranty: Date | null;
    product: { name: string; brand: string; spec: string; saleWarrantyMonths: number };
    customer: { name: string; phone: string } | null;
  };
  const toData = (row: SnRow): Record<string, string> => {
    let until = row.saleWarranty;
    if (!until && row.soldAt) until = addMonths(row.soldAt, row.product.saleWarrantyMonths || 12);
    const brand = (row.product.brand || "").trim();
    const model = (row.product.name || "").trim();
    const spec = (row.product.spec || "").trim();
    const main = brand && model ? (model.startsWith(brand) ? model : `${brand} ${model}`) : model || brand;
    const name = spec ? `${main} ${spec}` : main;
    return {
      ...shop,
      docNo: esc(row.saleDocNo || row.sn),
      name: esc(name),
      serial: esc(row.sn),
      warranty: until ? formatDate(until) : "—",
      customer: esc(row.customer?.name || ""),
      phone: esc(row.customer?.phone || shop.shopPhone || ""),
      date: row.soldAt ? formatDate(row.soldAt) : "",
      remark: "",
      rowsJson: "[]",
    };
  };

  const unique = await prisma.serialNumber.findUnique({
    where: { id },
    include: { product: true, customer: true },
  });
  if (unique) return [toData(unique)];

  const doc = await prisma.salesOrder.findUnique({
    where: { id },
    include: { customer: true, lines: true },
  });
  if (!doc) throw new Error("找不到串号或销售单");
  const sns = doc.lines.flatMap((l) => parseSerials(l.serialsJson)).filter(Boolean);
  if (!sns.length) throw new Error("本单没有串号，无法打保修箱贴");
  const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  const found = await prisma.serialNumber.findMany({
    where: { sn: { in: sns } },
    include: { product: true, customer: true },
  });
  const bySn = new Map(found.map((r) => [r.sn, r]));
  const out: Record<string, string>[] = [];
  for (const line of doc.lines) {
    const p = pmap[line.productId];
    for (const sn of parseSerials(line.serialsJson)) {
      const row = bySn.get(sn);
      if (row) out.push(toData(row));
      else if (p) {
        out.push(
          toData({
            sn,
            saleDocNo: doc.docNo,
            soldAt: doc.bizDate,
            saleWarranty: addMonths(doc.bizDate, line.saleWarrantyMonths || p.saleWarrantyMonths || 12),
            product: p,
            customer: doc.customer,
          }),
        );
      }
    }
  }
  if (!out.length) throw new Error("本单没有串号，无法打保修箱贴");
  return out;
}
