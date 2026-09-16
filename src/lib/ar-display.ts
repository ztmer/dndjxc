import { prisma } from "@/lib/prisma";
import { money, qty } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { AR_SOURCE, SETTLEMENT, label } from "@/lib/labels";
import { formatSerialsDisplay } from "@/lib/serials";

export type ArPickRow = {
  id: string;
  sourceNo: string;
  sourceType: string;
  typeLabel: string;
  href: string;
  date: string;
  settlement: string;
  settlementLabel: string;
  title: string;
  /** 显示在单号下方的正文：商品、工单过程、合同标题等 */
  content: string;
  detail: string;
  open: string;
};

function hrefOf(sourceType: string, sourceId: string) {
  if (sourceType === "salesOrder") return `/sales/${sourceId}`;
  if (sourceType === "workOrder") return `/work-orders/${sourceId}`;
  if (sourceType === "contract") return `/contracts/${sourceId}`;
  if (sourceType === "buildConfig") return `/builds/${sourceId}`;
  return "";
}

function idsOf(rows: { sourceType: string; sourceId: string }[], type: string) {
  return [...new Set(rows.filter((r) => r.sourceType === type).map((r) => r.sourceId))];
}

function joinNames(lines: { productId: string; qty: { toString(): string } | number }[], pname: Record<string, string>) {
  return lines.map((l) => `${pname[l.productId] ?? "商品"}×${qty(l.qty)}`).join("、");
}

function productLabel(p: { name: string; brand: string; spec: string }) {
  const brand = (p.brand || "").trim();
  const model = (p.name || "").trim();
  const main = brand && model ? (model.startsWith(brand) ? model : `${brand} ${model}`) : model || brand || "商品";
  return p.spec ? `${main} ${p.spec}` : main;
}

function stack(...parts: (string | undefined | null)[]) {
  return parts
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join("\n");
}

/** 收款核销用：把应收来源补成能看懂的摘要。 */
export async function describeArPicks(
  rows: {
    id: string;
    sourceType: string;
    sourceId: string;
    sourceNo: string;
    bizDate: Date;
    settlement: string;
    materialAmt: { toString(): string } | number;
    serviceAmt: { toString(): string } | number;
    totalAmt: { toString(): string } | number;
  }[],
  openById: Record<string, number>,
): Promise<ArPickRow[]> {
  const salesIds = idsOf(rows, "salesOrder");
  const woIds = idsOf(rows, "workOrder");
  const ctIds = idsOf(rows, "contract");
  const bdIds = idsOf(rows, "buildConfig");
  const [sales, wos, contracts, builds] = await Promise.all([
    salesIds.length
      ? prisma.salesOrder.findMany({ where: { id: { in: salesIds } }, include: { lines: true } })
      : [],
    woIds.length
      ? prisma.workOrder.findMany({
          where: { id: { in: woIds } },
          include: { project: true, site: true, lines: true },
        })
      : [],
    ctIds.length ? prisma.contract.findMany({ where: { id: { in: ctIds } } }) : [],
    bdIds.length ? prisma.buildConfig.findMany({ where: { id: { in: bdIds } }, include: { lines: true } }) : [],
  ]);
  const productIds = [
    ...sales.flatMap((s) => s.lines.map((l) => l.productId)),
    ...wos.flatMap((w) => w.lines.map((l) => l.productId)),
    ...builds.flatMap((b) => b.lines.map((l) => l.productId)),
  ];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: [...new Set(productIds)] } },
        select: { id: true, name: true, brand: true, spec: true },
      })
    : [];
  const pname = Object.fromEntries(products.map((p) => [p.id, productLabel(p)]));
  const salesMap = Object.fromEntries(sales.map((s) => [s.id, s]));
  const woMap = Object.fromEntries(wos.map((w) => [w.id, w]));
  const ctMap = Object.fromEntries(contracts.map((c) => [c.id, c]));
  const bdMap = Object.fromEntries(builds.map((b) => [b.id, b]));

  return rows.map((a) => {
    let title = "";
    let content = "";
    if (a.sourceType === "salesOrder") {
      const s = salesMap[a.sourceId];
      const names = s ? joinNames(s.lines, pname) : "";
      title = names || s?.remark?.trim() || "销售开单";
      content = stack(names, s?.remark);
    } else if (a.sourceType === "workOrder") {
      const w = woMap[a.sourceId];
      const where = w?.project ? `工程 ${w.project.name}` : w?.site?.name || "";
      const note = w?.processNote?.trim() || "";
      const advice = w?.nextAdvice?.trim() || "";
      const goods = w ? joinNames(w.lines, pname) : "";
      title = note.split(/\n/)[0] || where || goods || "工单";
      content = stack(where, note, goods ? `用料 ${goods}` : "", advice ? `下步 ${advice}` : "");
    } else if (a.sourceType === "contract") {
      const c = ctMap[a.sourceId];
      title = c?.title?.trim() || "工程合同";
      content = stack(c?.title, c?.durationNote, c?.remark);
    } else if (a.sourceType === "buildConfig") {
      const b = bdMap[a.sourceId];
      const goods = b ? joinNames(b.lines, pname) : "";
      title = b ? `组装 ${b.modelName}` : "组装配置";
      content = stack(title, goods, b?.remark);
    }
    if (!content.trim()) {
      const found =
        (a.sourceType === "salesOrder" && salesMap[a.sourceId]) ||
        (a.sourceType === "workOrder" && woMap[a.sourceId]) ||
        (a.sourceType === "contract" && ctMap[a.sourceId]) ||
        (a.sourceType === "buildConfig" && bdMap[a.sourceId]);
      content = found ? title || "（原单无摘要）" : "（原单缺失）";
    }
    const mat = Number(a.materialAmt);
    const svc = Number(a.serviceAmt);
    const bits = [];
    if (mat) bits.push(`材料 ${money(mat)}`);
    if (svc) bits.push(a.sourceType === "contract" ? `合同额 ${money(svc)}` : `服务 ${money(svc)}`);
    if (!bits.length) bits.push(`合计 ${money(a.totalAmt)}`);
    return {
      id: a.id,
      sourceNo: a.sourceNo,
      sourceType: a.sourceType,
      typeLabel: label(AR_SOURCE, a.sourceType),
      href: hrefOf(a.sourceType, a.sourceId),
      date: formatDate(a.bizDate),
      settlement: a.settlement,
      settlementLabel: label(SETTLEMENT, a.settlement),
      title,
      content,
      detail: bits.join(" · "),
      open: money(openById[a.id] ?? 0),
    };
  });
}

export type StatementDetailRow = {
  date: string;
  sourceNo: string;
  sourceType: string;
  typeLabel: string;
  href: string;
  name: string;
  spec: string;
  brand: string;
  unit: string;
  qty: string;
  price: string;
  amount: string;
  serial: string;
  content: string;
  material: string;
  service: string;
  total: string;
  received: string;
  open: string;
};

/** 对账单：把销售单、工单、组装单拆成原单明细行，按单据挨在一起。 */
export async function expandStatementDetailRows(
  entries: {
    id: string;
    sourceType: string;
    sourceId: string;
    sourceNo: string;
    bizDate: Date;
    materialAmt: { toString(): string } | number;
    serviceAmt: { toString(): string } | number;
    totalAmt: { toString(): string } | number;
    receivedAmt: { toString(): string } | number;
  }[],
): Promise<StatementDetailRow[]> {
  const salesIds = idsOf(entries, "salesOrder");
  const woIds = idsOf(entries, "workOrder");
  const bdIds = idsOf(entries, "buildConfig");
  const ctIds = idsOf(entries, "contract");
  const [sales, wos, builds, contracts] = await Promise.all([
    salesIds.length
      ? prisma.salesOrder.findMany({ where: { id: { in: salesIds } }, include: { lines: true } })
      : [],
    woIds.length
      ? prisma.workOrder.findMany({ where: { id: { in: woIds } }, include: { lines: true, project: true, site: true } })
      : [],
    bdIds.length ? prisma.buildConfig.findMany({ where: { id: { in: bdIds } }, include: { lines: true } }) : [],
    ctIds.length ? prisma.contract.findMany({ where: { id: { in: ctIds } } }) : [],
  ]);
  const productIds = [
    ...sales.flatMap((s) => s.lines.map((l) => l.productId)),
    ...wos.flatMap((w) => w.lines.map((l) => l.productId)),
    ...builds.flatMap((b) => b.lines.map((l) => l.productId)),
  ];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: [...new Set(productIds)] } },
        select: { id: true, name: true, brand: true, spec: true, unit: true },
      })
    : [];
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  const salesMap = Object.fromEntries(sales.map((s) => [s.id, s]));
  const woMap = Object.fromEntries(wos.map((w) => [w.id, w]));
  const bdMap = Object.fromEntries(builds.map((b) => [b.id, b]));
  const ctMap = Object.fromEntries(contracts.map((c) => [c.id, c]));

  const out: StatementDetailRow[] = [];
  const sorted = [...entries].sort((a, b) => a.bizDate.getTime() - b.bizDate.getTime());
  for (const a of sorted) {
    const open = Number(a.totalAmt) - Number(a.receivedAmt);
    const head = {
      date: formatDate(a.bizDate),
      sourceNo: a.sourceNo,
      sourceType: a.sourceType,
      typeLabel: label(AR_SOURCE, a.sourceType),
      href: hrefOf(a.sourceType, a.sourceId),
      material: money(a.materialAmt),
      service: money(a.serviceAmt),
      total: money(a.totalAmt),
      received: money(a.receivedAmt),
      open: money(open),
    };
    const blankHead = { ...head, material: "", service: "", total: "", received: "", open: "" };

    type Line = { name: string; spec: string; brand: string; unit: string; qty: string; price: string; amount: string; serial: string; content: string };
    const lines: Line[] = [];

    if (a.sourceType === "salesOrder") {
      const doc = salesMap[a.sourceId];
      for (const l of doc?.lines ?? []) {
        const p = pmap[l.productId];
        lines.push({
          name: p ? productLabel(p) : "商品",
          spec: p?.spec ?? "",
          brand: p?.brand ?? "",
          unit: p?.unit ?? "",
          qty: qty(l.qty),
          price: money(l.price),
          amount: money(l.amount),
          serial: formatSerialsDisplay(l.serialsJson),
          content: p ? productLabel(p) : "",
        });
      }
    } else if (a.sourceType === "workOrder") {
      const doc = woMap[a.sourceId];
      const where = doc?.project ? `工程 ${doc.project.name}` : doc?.site?.name || "";
      for (const l of doc?.lines ?? []) {
        const p = pmap[l.productId];
        const pname = p ? productLabel(p) : "项目";
        lines.push({
          name: pname,
          spec: p?.spec ?? "",
          brand: p?.brand ?? "",
          unit: p?.unit ?? "",
          qty: qty(l.qty),
          price: money(l.price),
          amount: money(l.amount),
          serial: formatSerialsDisplay(l.serialsJson),
          content: [where, pname].filter(Boolean).join(" "),
        });
      }
      if (!lines.length) {
        lines.push({
          name: doc?.processNote?.trim().split(/\n/)[0] || "工单",
          spec: "",
          brand: "",
          unit: "",
          qty: "1",
          price: money(a.totalAmt),
          amount: money(a.totalAmt),
          serial: "—",
          content: stack(where, doc?.processNote),
        });
      }
    } else if (a.sourceType === "buildConfig") {
      const doc = bdMap[a.sourceId];
      for (const l of doc?.lines ?? []) {
        const p = pmap[l.productId];
        lines.push({
          name: p ? productLabel(p) : "配件",
          spec: p?.spec ?? "",
          brand: p?.brand ?? "",
          unit: p?.unit ?? "",
          qty: qty(l.qty),
          price: money(l.price),
          amount: money(l.amount),
          serial: formatSerialsDisplay(l.serialsJson),
          content: p ? productLabel(p) : "",
        });
      }
    } else if (a.sourceType === "contract") {
      const doc = ctMap[a.sourceId];
      lines.push({
        name: doc?.title?.trim() || "工程合同",
        spec: "",
        brand: "",
        unit: "项",
        qty: "1",
        price: money(a.totalAmt),
        amount: money(a.totalAmt),
        serial: "—",
        content: stack(doc?.title, doc?.durationNote),
      });
    }

    if (!lines.length) {
      lines.push({
        name: a.sourceNo,
        spec: "",
        brand: "",
        unit: "",
        qty: "1",
        price: money(a.totalAmt),
        amount: money(a.totalAmt),
        serial: "—",
        content: a.sourceNo,
      });
    }

    lines.forEach((line, i) => {
      out.push({ ...(i === 0 ? head : blankHead), ...line });
    });
  }
  return out;
}
