import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { money, qty } from "@/lib/money";
import { DOC_STATUS, SETTLEMENT, VISIT_TYPE, label } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { writeAppLog } from "@/lib/app-log";
import { renderDocTablePng, renderWorkOrderPng } from "@/lib/work-order-report-png";
import { formatSerialsDisplay } from "@/lib/serials";
import { parseWecomDocTypes, wecomDocLabel, type WecomDocType } from "@/lib/wecom-docs";

export { parseWecomDocTypes, wecomDocLabel, WECOM_DOC_OPTIONS, type WecomDocType } from "@/lib/wecom-docs";

const WEBHOOK = /^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=[a-zA-Z0-9-]+$/;

export function isWecomWebhook(url: string) {
  return WEBHOOK.test(url.trim());
}

async function postWecom(url: string, body: unknown) {
  const res = await fetch(url.trim(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { errcode?: number; errmsg?: string };
  if (!res.ok || json.errcode) {
    throw new Error(json.errmsg || `企业微信返回 ${res.status}`);
  }
}

export async function sendWecomImage(url: string, png: Buffer, caption?: string, mentionAll?: boolean) {
  if (caption) {
    await postWecom(url, {
      msgtype: "text",
      text: {
        content: caption,
        mentioned_list: mentionAll ? ["@all"] : [],
      },
    });
  }
  await postWecom(url, {
    msgtype: "image",
    image: {
      base64: png.toString("base64"),
      md5: createHash("md5").update(png).digest("hex"),
    },
  });
}

async function shopBits() {
  const company = await prisma.company.findUnique({ where: { id: "default" } });
  return { shop: company?.name || "电脑店", shopPhone: company?.phone || "" };
}

export async function renderWorkOrderReportPng(id: string) {
  const doc = await prisma.workOrder.findUnique({
    where: { id },
    include: { customer: true, site: true, lines: true, labors: true },
  });
  if (!doc) throw new Error("工单不存在");
  const products = await prisma.product.findMany({
    where: { id: { in: doc.lines.map((l) => l.productId) } },
    select: { id: true, name: true, unit: true },
  });
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  const shop = await shopBits();
  const lines = [
    ...doc.lines.map((l) => ({
      name: pmap[l.productId]?.name ?? l.productId,
      unit: pmap[l.productId]?.unit || "",
      qty: qty(l.qty),
      price: money(l.price),
      amount: money(l.amount),
      flag: [l.isWarrantyFree ? "保内免费" : "", l.isContractExtra ? "合同外" : ""].filter(Boolean).join(" "),
    })),
    ...doc.labors.map((l) => ({
      name: `工时 ${l.name}`,
      unit: "天",
      qty: qty(l.days),
      price: money(l.dayRate),
      amount: money(l.amount),
      flag: "临时工",
    })),
  ];
  const png = await renderWorkOrderPng({
    ...shop,
    title: "工单",
    docNo: doc.docNo,
    status: label(DOC_STATUS, doc.status),
    customer: doc.customer.name,
    phone: doc.customer.phone,
    address: [doc.site?.name, doc.site?.address || doc.customer.address].filter(Boolean).join(" "),
    visit: label(VISIT_TYPE, doc.visitType),
    appointed: doc.appointedAt ? formatDateTime(doc.appointedAt) : "",
    settlement: label(SETTLEMENT, doc.settlement),
    process: doc.processNote,
    nextAdvice: doc.nextAdvice,
    lines,
    total: `¥${money(doc.billableAmt)}`,
  });
  return { png, caption: `工单 ${doc.docNo}　${doc.customer.name}　应收 ¥${money(doc.billableAmt)}`, docNo: doc.docNo };
}

async function productNames(ids: string[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, brand: true, spec: true, unit: true },
  });
  return Object.fromEntries(
    products.map((p) => {
      const brand = (p.brand || "").trim();
      const model = (p.name || "").trim();
      const spec = (p.spec || "").trim();
      const main = brand && model ? (model.startsWith(brand) ? model : `${brand} ${model}`) : model || brand;
      return [p.id, { name: spec ? `${main} ${spec}` : main, unit: p.unit || "" }];
    }),
  );
}

export async function renderSalesReportPng(id: string, asDelivery: boolean) {
  const doc = await prisma.salesOrder.findUnique({
    where: { id },
    include: { customer: true, lines: true },
  });
  if (!doc) throw new Error("销售单不存在");
  const pmap = await productNames(doc.lines.map((l) => l.productId));
  const shop = await shopBits();
  const title = asDelivery ? "送货单" : "销售单";
  const png = await renderDocTablePng({
    ...shop,
    title,
    docNo: doc.docNo,
    status: label(DOC_STATUS, doc.status),
    metaLines: [
      `客户：${doc.customer.name}　电话：${doc.customer.phone || "—"}　结算：${label(SETTLEMENT, doc.settlement)}`,
      asDelivery ? `地址：${doc.customer.address || "—"}　日期：${formatDate(doc.bizDate)}` : `日期：${formatDate(doc.bizDate)}　${doc.remark ? `备注：${doc.remark}` : ""}`,
    ],
    cols: asDelivery
      ? [
          { key: "name", label: "品名规格", weight: 32 },
          { key: "unit", label: "单位", weight: 8 },
          { key: "qty", label: "数量", weight: 10 },
          { key: "price", label: "单价", weight: 12 },
          { key: "amount", label: "金额", weight: 12 },
          { key: "serial", label: "串号", weight: 16 },
        ]
      : [
          { key: "name", label: "商品", weight: 38 },
          { key: "unit", label: "单位", weight: 8 },
          { key: "qty", label: "数量", weight: 12 },
          { key: "price", label: "单价", weight: 14 },
          { key: "amount", label: "金额", weight: 14 },
        ],
    rows: doc.lines.map((l) => ({
      name: pmap[l.productId]?.name ?? l.productId,
      unit: pmap[l.productId]?.unit || "",
      qty: qty(l.qty),
      price: money(l.price),
      amount: money(l.amount),
      serial: formatSerialsDisplay(l.serialsJson),
    })),
    footLines: asDelivery ? ["收货人签收：________"] : [],
    total: `¥${money(doc.totalAmt)}`,
  });
  return {
    png,
    caption: `【${title}】${doc.docNo}　${doc.customer.name}　¥${money(doc.totalAmt)}`,
    docNo: doc.docNo,
  };
}

export async function renderContractReportPng(id: string) {
  const doc = await prisma.contract.findUnique({
    where: { id },
    include: { customer: true, schedules: true },
  });
  if (!doc) throw new Error("合同不存在");
  const shop = await shopBits();
  const png = await renderDocTablePng({
    ...shop,
    title: "工程合同",
    docNo: doc.docNo,
    status: label(DOC_STATUS, doc.status),
    metaLines: [
      `工程：${doc.title || "—"}`,
      `甲方：${doc.customer.name}　电话：${doc.customer.phone || "—"}　签订：${formatDate(doc.signDate)}`,
      `结算：${label(SETTLEMENT, doc.settlement)}　质保 ${doc.warrantyMonths} 个月`,
    ],
    cols: [
      { key: "name", label: "款项", weight: 50 },
      { key: "amount", label: "金额", weight: 22 },
      { key: "date", label: "预计日期", weight: 28 },
    ],
    rows:
      doc.schedules.length > 0
        ? doc.schedules.map((s) => ({
            name: s.name,
            amount: money(s.amount),
            date: s.dueDate ? formatDate(s.dueDate) : "—",
          }))
        : [{ name: "合同总额（未拆分款项）", amount: money(doc.amount), date: "—" }],
    footLines: [doc.remark ? `备注：${doc.remark}` : ""],
    total: `¥${money(doc.amount)}`,
  });
  return {
    png,
    caption: `【合同】${doc.docNo}　${doc.customer.name}　¥${money(doc.amount)}`,
    docNo: doc.docNo,
  };
}

export async function renderInstallSheetPng(id: string) {
  const doc = await prisma.buildConfig.findUnique({
    where: { id },
    include: { customer: true, lines: true },
  });
  if (!doc) throw new Error("配置单不存在");
  const pmap = await productNames(doc.lines.map((l) => l.productId));
  const shop = await shopBits();
  const png = await renderDocTablePng({
    ...shop,
    title: "装机单",
    docNo: doc.docNo,
    status: label(DOC_STATUS, doc.status),
    metaLines: [
      `客户：${doc.customer.name}　机型：${doc.modelName || "—"}`,
      doc.unitSn ? `整机 SN：${doc.unitSn}` : "整机 SN：—",
    ],
    cols: [
      { key: "slot", label: "槽位", weight: 14 },
      { key: "name", label: "配件", weight: 38 },
      { key: "unit", label: "单位", weight: 8 },
      { key: "qty", label: "数量", weight: 12 },
      { key: "serial", label: "串号", weight: 28 },
    ],
    rows: doc.lines.map((l) => ({
      slot: l.slot || "—",
      name: pmap[l.productId]?.name ?? l.productId,
      unit: pmap[l.productId]?.unit || "",
      qty: qty(l.qty),
      serial: formatSerialsDisplay(l.serialsJson),
    })),
    footLines: ["本单供装机核对，不列单价与金额"],
  });
  return {
    png,
    caption: `【装机单】${doc.docNo}　${doc.customer.name}　${doc.modelName}`,
    docNo: doc.docNo,
  };
}

export async function renderWecomDocPng(type: WecomDocType, id: string) {
  if (type === "workOrder") return renderWorkOrderReportPng(id);
  if (type === "salesOrder") return renderSalesReportPng(id, false);
  if (type === "deliveryNote") return renderSalesReportPng(id, true);
  if (type === "contract") return renderContractReportPng(id);
  return renderInstallSheetPng(id);
}

export async function notifyWecom(type: WecomDocType, id: string, kind: "create" | "submit") {
  try {
    const cfg = await prisma.wecomSetting.findUnique({ where: { id: "default" } });
    if (!cfg?.enabled || !isWecomWebhook(cfg.webhookUrl)) return;
    if (kind === "create" && !cfg.onCreate) return;
    if (kind === "submit" && !cfg.onSubmit) return;
    if (!parseWecomDocTypes(cfg.docTypes).includes(type)) return;
    const r = await renderWecomDocPng(type, id);
    const verb = kind === "create" ? "新建" : "审核";
    const tag = wecomDocLabel(type);
    await sendWecomImage(cfg.webhookUrl, r.png, `【${tag}${verb}】${r.caption.replace(/^【.*?】/, "").trim()}`, cfg.mentionAll);
    await writeAppLog({ module: "企业微信", action: `推送${tag}${verb}`, detail: r.docNo });
  } catch (e) {
    await writeAppLog({
      module: "企业微信",
      action: "推送失败",
      detail: e instanceof Error ? e.message : "未知错误",
      level: "error",
    });
  }
}

export async function notifyWecomWorkOrder(id: string, kind: "create" | "submit") {
  return notifyWecom("workOrder", id, kind);
}

export async function notifyWecomSales(id: string, kind: "create" | "submit") {
  await notifyWecom("salesOrder", id, kind);
  await notifyWecom("deliveryNote", id, kind);
}

export async function notifyWecomContract(id: string, kind: "create" | "submit") {
  return notifyWecom("contract", id, kind);
}

export async function notifyWecomInstall(id: string, kind: "create" | "submit") {
  return notifyWecom("installSheet", id, kind);
}
