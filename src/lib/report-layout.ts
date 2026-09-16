import { esc } from "@/lib/money-cn";
import { paperForBiz, isLabelPaper, paperPageSize } from "@/lib/report-formats";

export type LayoutItem = { key: string; label: string; show: boolean; width?: number };
export type LayoutClause = { title: string; body: string };

export type ReportLayout = {
  v: 1;
  title: string;
  paper: string;
  copies: number;
  copyLabels: string[];
  showShopName: boolean;
  showShopAddress: boolean;
  showShopPhone: boolean;
  fontSize: number;
  showAmountCn: boolean;
  showTax: boolean;
  showRemark: boolean;
  showSchedules: boolean;
  /** 纸面边距，毫米 */
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  /** 送货单右侧竖排联次（红联/黄联/白联） */
  showSpine: boolean;
  spineTexts: string[];
  showLogo: boolean;
  showSeal: boolean;
  headerNote: string;
  footerNote: string;
  partyALabel: string;
  partyBLabel: string;
  intro: string;
  metas: LayoutItem[];
  cols: LayoutItem[];
  signs: { label: string }[];
  clauses: LayoutClause[];
};

/** 旧内置列宽。命中则换成现行默认；店里手改成其它数字的保持不变。 */
const LEGACY_COL_WIDTHS: Record<string, number[]> = {
  name: [22, 28, 40],
  content: [36],
  qty: [8, 10],
  price: [9, 10, 12],
  amount: [10, 12, 20],
  unit: [6],
  serial: [12, 14, 18],
  sourceNo: [14],
  date: [9, 10],
  cost: [12],
};

function mergedWidth(saved: unknown, base: number | undefined, key: string) {
  const fallback = Math.max(1, Number(base) || 10);
  const n = Number(saved);
  if (!Number.isFinite(n) || n < 1) return fallback;
  if (LEGACY_COL_WIDTHS[key]?.includes(n) && fallback !== n) return fallback;
  return Math.max(1, n);
}

function mergeItems(saved: LayoutItem[] | undefined, defaults: LayoutItem[]): LayoutItem[] {
  if (!Array.isArray(saved) || !saved.length) return defaults;
  const byKey = new Map(defaults.map((d) => [d.key, d]));
  for (const s of saved) {
    const base = byKey.get(s.key);
    byKey.set(s.key, {
      key: s.key,
      label: s.label || base?.label || s.key,
      show: !!s.show,
      width: mergedWidth(s.width ?? base?.width, base?.width, s.key),
    });
  }
  const order = [...saved.map((s) => s.key), ...defaults.map((d) => d.key).filter((k) => !saved.some((s) => s.key === k))];
  return order.map((k) => byKey.get(k)!).filter(Boolean);
}

function m(key: string, label: string, show = true, width = 10): LayoutItem {
  return { key, label, show, width };
}

const CONTRACT_CLAUSES: LayoutClause[] = [
  {
    title: "第一条　工程内容与标的",
    body: "1.1 工程名称：{{title}}。\n1.2 工期：{{duration}}。\n1.3 工作内容以双方确认的点位、图纸或现场交底为准。本合同备注：{{remark}}",
  },
  {
    title: "第二条　合同价款与发票",
    body: "2.1 合同总价为人民币（大写）{{amountCn}}（小写 ¥{{amount}}），{{taxText}}。\n2.2 开票约定：{{invoiceText}}。\n2.3 合同价款已包含约定范围内的材料、施工及质保。合同外增项须书面确认后另行计费。",
  },
  {
    title: "第三条　付款方式",
    body: "3.1 结算周期：{{settlement}}。\n3.2 甲方应按约定支付。现金、微信、支付宝、转账均以乙方收款单为准。",
  },
  {
    title: "第四条　双方责任",
    body: "甲方责任：按约定付款；提供施工现场条件、电源、进场许可；及时验收。\n乙方责任：按约定施工、使用合格材料；遵守现场安全规定；对施工质量负责；完工后清理现场。",
  },
  {
    title: "第五条　验收与质保",
    body: "5.1 工程完工后双方验收。验收合格日为质保起算日。\n5.2 质保期为验收合格之日起 {{warrantyMonths}} 个月。质保期内因乙方施工或材料导致的故障，乙方免费维修（人为损坏、自然灾害、甲方擅自改动除外）。",
  },
  {
    title: "第六条　违约与其它",
    body: "6.1 甲方逾期付款的，乙方可暂停施工。\n6.2 争议先协商；协商不成向乙方所在地人民法院起诉。\n6.3 本合同一式贰份，双方各执壹份，签字盖章后生效。",
  },
];

export function defaultLayout(bizType: string): ReportLayout {
  const paper = paperForBiz(bizType);
  const base: ReportLayout = {
    v: 1,
    title: "单据",
    paper,
    copies: 1,
    copyLabels: ["正本"],
    showShopName: true,
    showShopAddress: false,
    showShopPhone: false,
    fontSize: 13,
    showAmountCn: false,
    showTax: false,
    showRemark: true,
    showSchedules: false,
    marginTop: 16,
    marginRight: 16,
    marginBottom: 16,
    marginLeft: 16,
    showSpine: false,
    spineTexts: [],
    showLogo: false,
    showSeal: false,
    headerNote: "",
    footerNote: "",
    partyALabel: "甲方（客户）",
    partyBLabel: "乙方（本店）",
    intro: "",
    metas: [],
    cols: [],
    signs: [{ label: "经手人" }, { label: "客户签收" }],
    clauses: [],
  };

  if (bizType === "deliveryNote") {
    return {
      ...base,
      title: "送货单",
      copies: 1,
      copyLabels: [],
      showShopAddress: true,
      showShopPhone: true,
      fontSize: 12,
      showAmountCn: true,
      showTax: true,
      marginTop: 8,
      marginRight: 8,
      marginBottom: 8,
      marginLeft: 8,
      showSpine: true,
      spineTexts: ["红联 收款", "黄联 客户", "白联 留存"],
      showLogo: true,
      showSeal: true,
      metas: [
        m("docNo", "单号"),
        m("date", "日期"),
        m("customer", "收货单位"),
        m("contact", "联系人", false),
        m("phone", "电话"),
        m("address", "送货地址"),
        m("settlement", "结算"),
        m("status", "状态", false),
      ],
      cols: [
        m("name", "品名规格", true, 40),
        m("brand", "品牌", false, 10),
        m("spec", "规格", false, 12),
        m("unit", "单位", true, 8),
        m("qty", "数量", true, 10),
        m("price", "单价", true, 12),
        m("amount", "金额", true, 12),
        m("serial", "串号", true, 14),
        m("code", "货号", false, 10),
        m("remark", "备注", false, 10),
      ],
      signs: [{ label: "送货人" }, { label: "收货人签收" }, { label: "日期" }],
    };
  }
  if (bizType === "statement") {
    return {
      ...base,
      title: "往来对账单",
      showShopAddress: true,
      showShopPhone: true,
      showAmountCn: true,
      showLogo: true,
      showSeal: true,
      footerNote: "如有异议请于五个工作日内书面提出，逾期视为确认。收款方式以实际收款单为准。",
      partyALabel: "甲方（客户）",
      partyBLabel: "乙方（供货/服务方）",
      metas: [m("customer", "客户"), m("contact", "联系人"), m("phone", "电话"), m("period", "对账期间"), m("docNo", "对账单号"), m("settlement", "结算周期")],
      cols: [
        m("date", "日期", true, 10),
        m("sourceNo", "单号", true, 12),
        m("typeLabel", "单据", true, 8),
        m("name", "品名", true, 28),
        m("spec", "规格", false, 10),
        m("unit", "单位", true, 6),
        m("qty", "数量", true, 8),
        m("price", "单价", true, 10),
        m("amount", "金额", true, 12),
        m("serial", "串号", false, 12),
        m("content", "摘要", false, 16),
        m("material", "材料", false, 9),
        m("service", "服务", false, 9),
        m("total", "本单合计", false, 10),
        m("received", "已收", false, 9),
        m("open", "未收", false, 9),
      ],
      signs: [{ label: "甲方确认（盖章）" }, { label: "乙方（盖章）" }],
    };
  }
  if (bizType === "contract") {
    return {
      ...base,
      title: "工程承包合同",
      showShopAddress: true,
      showShopPhone: true,
      showSchedules: true,
      showLogo: true,
      showSeal: true,
      intro: "根据《中华人民共和国民法典》及相关规定，甲乙双方本着平等、自愿、诚信原则，就本工程事宜订立本合同。",
      metas: [m("docNo", "合同编号"), m("signDate", "签订日期")],
      cols: [m("name", "款项", true, 52), m("amount", "金额", true, 24), m("date", "预计日期", true, 24)],
      signs: [{ label: "甲方（盖章）授权代表" }, { label: "乙方（盖章）授权代表" }],
      clauses: CONTRACT_CLAUSES.map((c) => ({ ...c })),
    };
  }
  if (bizType === "salesOrder") {
    return {
      ...base,
      title: "销售单",
      showAmountCn: true,
      showTax: true,
      metas: [m("docNo", "单号"), m("date", "日期"), m("customer", "客户"), m("phone", "电话", false), m("settlement", "结算")],
      cols: [m("name", "商品", true, 52), m("unit", "单位", true, 8), m("qty", "数量", true, 12), m("price", "单价", true, 14), m("amount", "金额", true, 14), m("serial", "串号", false, 14)],
    };
  }
  if (bizType === "buildConfig") {
    return {
      ...base,
      title: "组装配置单",
      footerNote: "客户联不含进价",
      metas: [m("docNo", "单号"), m("customer", "客户"), m("modelName", "机型"), m("labor", "工时")],
      cols: [m("name", "配件", true, 44), m("unit", "单位", true, 8), m("qty", "数量", true, 12), m("price", "单价", true, 14), m("amount", "金额", true, 14), m("serial", "串号", false, 14)],
    };
  }
  if (bizType === "installSheet") {
    return {
      ...base,
      title: "装机单",
      showAmountCn: false,
      showTax: false,
      footerNote: "本单供装机核对，不列单价与金额",
      metas: [m("docNo", "单号"), m("customer", "客户"), m("modelName", "机型"), m("unitSn", "整机 SN", false)],
      cols: [
        m("slot", "槽位", true, 12),
        m("name", "配件", true, 40),
        m("unit", "单位", true, 8),
        m("qty", "数量", true, 12),
        m("serial", "串号", true, 28),
        m("price", "单价", false, 10),
        m("amount", "金额", false, 10),
      ],
      signs: [{ label: "装机人" }, { label: "客户确认" }],
    };
  }
  if (bizType === "workOrder") {
    return {
      ...base,
      title: "工单",
      metas: [m("docNo", "单号"), m("customer", "客户"), m("phone", "电话", false), m("process", "过程")],
      cols: [m("name", "项目", true, 44), m("unit", "单位", true, 8), m("qty", "数量", true, 12), m("price", "单价", false, 14), m("amount", "金额", true, 14), m("serial", "串号", true, 18)],
    };
  }
  if (bizType === "purchaseReceipt") {
    return {
      ...base,
      title: "采购入库",
      metas: [m("docNo", "单号"), m("supplier", "供应商")],
      cols: [m("name", "商品", true, 44), m("unit", "单位", true, 8), m("qty", "数量", true, 12), m("cost", "进价", true, 14), m("serial", "唯一 SN", true, 22)],
    };
  }
  if (bizType === "receipt") {
    return {
      ...base,
      title: "收款单",
      showRemark: true,
      showAmountCn: true,
      metas: [m("docNo", "单号"), m("date", "日期"), m("customer", "客户"), m("method", "方式")],
      cols: [
        m("sourceNo", "来源单号", true, 16),
        m("date", "日期", true, 12),
        m("content", "核销内容", true, 46),
        m("qty", "笔数", true, 8),
        m("amount", "本次收款", true, 16),
      ],
      signs: [{ label: "收款人" }, { label: "客户" }],
    };
  }
  if (bizType === "warrantyLabel") {
    return {
      ...base,
      title: "保修",
      paper: "70x50",
      fontSize: 11,
      copies: 1,
      copyLabels: [],
      showShopName: true,
      showShopAddress: false,
      showShopPhone: true,
      showAmountCn: false,
      showTax: false,
      showRemark: false,
      showSpine: false,
      showLogo: false,
      showSeal: false,
      marginTop: 2,
      marginRight: 2,
      marginBottom: 2,
      marginLeft: 2,
      metas: [
        m("name", "品名", true, 20),
        m("serial", "SN", true, 16),
        m("warranty", "保修至", true, 12),
        m("date", "销售日", true, 10),
        m("customer", "客户", false, 10),
        m("phone", "电话", true, 12),
        m("docNo", "单号", false, 10),
      ],
      cols: [],
      signs: [],
    };
  }
  return base;
}

export function parseLayout(raw: string | undefined | null, bizType: string): ReportLayout {
  const base = defaultLayout(bizType);
  if (!raw || raw === "{}") return base;
  try {
    const j = JSON.parse(raw) as Partial<ReportLayout>;
    if (!j || typeof j !== "object") return base;
    const paper = j.paper || base.paper;
    const ncr = paper === "210x140";
    const compact = isLabelPaper(paper);
    const defM = compact ? 2 : paper === "ticket" ? 4 : ncr ? 8 : 16;
    const oldStatement = bizType === "statement" && Array.isArray(j.cols) && j.cols.length > 0 && !j.cols.some((c) => c.key === "qty");
    return {
      ...base,
      ...j,
      v: 1,
      paper,
      copies: ncr || compact ? 1 : Math.max(1, Number(j.copies) || base.copies),
      copyLabels: ncr || compact ? [] : Array.isArray(j.copyLabels) && j.copyLabels.length ? j.copyLabels : base.copyLabels,
      marginTop: Math.max(0, Number(j.marginTop ?? base.marginTop ?? defM) || 0),
      marginRight: Math.max(0, Number(j.marginRight ?? base.marginRight ?? defM) || 0),
      marginBottom: Math.max(0, Number(j.marginBottom ?? base.marginBottom ?? defM) || 0),
      marginLeft: Math.max(0, Number(j.marginLeft ?? base.marginLeft ?? defM) || 0),
      showSpine: typeof j.showSpine === "boolean" ? j.showSpine : base.showSpine,
      spineTexts: Array.isArray(j.spineTexts)
        ? j.spineTexts.map((s) => String(s))
        : base.spineTexts,
      showLogo: typeof j.showLogo === "boolean" ? j.showLogo : base.showLogo,
      showSeal: typeof j.showSeal === "boolean" ? j.showSeal : base.showSeal,
      metas: mergeItems(j.metas, base.metas),
      cols: (oldStatement ? base.cols : mergeItems(j.cols, base.cols)).map((c) =>
        c.key === "unit" ? { ...c, show: true } : c,
      ),
      signs: Array.isArray(j.signs) ? j.signs : base.signs,
      clauses: Array.isArray(j.clauses) ? j.clauses : base.clauses,
    };
  } catch {
    return base;
  }
}

function fill(text: string, data: Record<string, string>) {
  let out = text;
  for (const [k, v] of Object.entries(data)) out = out.replaceAll(`{{${k}}}`, v ?? "");
  return out;
}

function pageCss(layout: ReportLayout) {
  const { paper, fontSize: fs } = layout;
  const t = Math.max(0, layout.marginTop);
  const compact = isLabelPaper(paper);
  const r = Math.max(0, layout.marginRight) + (layout.showSpine && !compact ? 10 : 0);
  const b = Math.max(0, layout.marginBottom);
  const l = Math.max(0, layout.marginLeft);
  const size = paperPageSize(paper);
  const sheetBreak = paper === "210x140" || paper === "ticket" ? "auto" : "always";
  const sealRight = layout.showSpine ? 14 : 8;
  const padB = compact ? b : b + (layout.showSeal ? 12 : 0);
  const sealW = paper === "210x140" ? 24 : 32;
  const sheetBox = compact
    ? "width:70mm;height:50mm;max-width:70mm;overflow:hidden;"
    : "width:100%;max-width:100%;";
  // 明细表不能叫 grid：Tailwind 的 .grid 是 display:grid，会把表头/表体拆开、拉不满。
  return [
    `@page{size:${size};margin:${compact ? "0" : `${t}mm ${r}mm ${padB}mm ${l}mm`}}`,
    `@media print{.no-print{display:none!important}body{margin:0}.sheet{margin-bottom:0${compact ? "" : ";padding:0"}}}`,
    `.sheet{box-sizing:border-box;${sheetBox}font-size:${fs}px;color:#111;line-height:1.45;border:1px solid #111;padding:${t}mm ${r}mm ${padB}mm ${l}mm;margin-bottom:10px;page-break-after:${sheetBreak};position:relative;overflow:hidden}`,
    `h1.shop{margin:0;text-align:center;font-size:${fs + 5}px}`,
    `h2.ttl{margin:4px 0 8px;text-align:center;font-size:${fs + 2}px;letter-spacing:4px}`,
    `.meta{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 1.6em;width:100%;box-sizing:border-box;margin:4px 0;border:none}`,
    `.meta-cell{box-sizing:border-box;min-width:0;padding:0;border:none;word-break:break-word}`,
    `.sumline{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px 16px;width:100%;box-sizing:border-box;margin:0;padding:4px 8px;border:1px solid #333;font-weight:700}`,
    `table.rpt-tbl+.sumline{border-top:none}`,
    `table.rpt-tbl{display:table!important;width:100%!important;max-width:100%!important;min-width:100%!important;table-layout:fixed!important;border-collapse:collapse;margin:6px 0 0}`,
    `table.rpt-tbl colgroup{display:table-column-group!important}`,
    `table.rpt-tbl col{display:table-column!important}`,
    `table.rpt-tbl thead{display:table-header-group!important}`,
    `table.rpt-tbl tbody{display:table-row-group!important}`,
    `table.rpt-tbl tfoot{display:table-footer-group!important}`,
    `table.rpt-tbl tr{display:table-row!important}`,
    `table.rpt-tbl td,table.rpt-tbl th{display:table-cell!important;border:1px solid #333;padding:3px 4px;word-break:break-word;overflow:hidden;vertical-align:middle}`,
    `table.rpt-tbl th{background:#f3f3f3;text-align:center}`,
    `table.rpt-tbl tfoot td{font-weight:700;background:#f3f3f3}`,
    `.num{text-align:right;white-space:nowrap}`,
    `.copy{position:absolute;right:${r + 2}mm;top:${t}mm;border:1px solid #333;padding:1px 8px}`,
    `.signs{display:flex;justify-content:space-between;gap:12px;margin-top:12px;flex-wrap:wrap;padding-right:2mm}`,
    `.clause{margin:10px 0}`,
    `.clause h3{font-size:${fs + 1}px;margin:0 0 4px}`,
    `.spine{position:absolute;right:1.5mm;top:0;bottom:0;display:flex;flex-direction:row-reverse;align-items:center;justify-content:center;gap:3.2mm;z-index:2;pointer-events:none}`,
    `.spine-col{display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:${Math.max(10, fs - 1)}px;line-height:1.2;font-weight:700}`,
    `.spine-ch{display:block}`,
    `.spine-gap{display:block;height:0.5em}`,
    `.headband{position:relative;min-height:13mm;margin-bottom:2px}`,
    `.shop-logo{position:absolute;left:0;top:0;max-height:13mm;max-width:46mm;object-fit:contain}`,
    `.shop-seal{position:absolute;right:${sealRight}mm;bottom:6mm;width:${sealW}mm;height:${sealW}mm;object-fit:contain;opacity:.92;z-index:5;pointer-events:none}`,
    `.sheet-label{line-height:1.25}`,
    `.sheet-label h2.ttl{letter-spacing:2px;margin:2px 0 4px}`,
    `.sheet-label .meta{flex-direction:column;gap:1px;margin:2px 0}`,
    `.sheet-label .meta-cell{padding:1px 0}`,
    compact ? `@media print{.sheet{margin-bottom:0}}` : "",
  ].join("");
}

function spineHtml(layout: ReportLayout) {
  if (!layout.showSpine) return "";
  const cols = layout.spineTexts.map((s) => String(s).trim()).filter(Boolean);
  if (!cols.length) return "";
  return `<div class="spine">${cols
    .map((text) => {
      const chars = [...text];
      const inner = chars
        .map((ch) => (ch === " " ? `<span class="spine-gap"></span>` : `<span class="spine-ch">${esc(ch)}</span>`))
        .join("");
      return `<div class="spine-col">${inner}</div>`;
    })
    .join("")}</div>`;
}

function parseNum(s: string | undefined) {
  if (!s) return 0;
  const n = Number(String(s).replace(/,/g, "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmtQty(n: number) {
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return String(Math.round(n * 10000) / 10000);
}

function fmtAmt(n: number) {
  return n.toFixed(2);
}

function itemWidth(it: LayoutItem, fallback = 10) {
  return Math.max(1, Number(it.width) || fallback);
}

function metaHtml(layout: ReportLayout, data: Record<string, string>) {
  const shown = layout.metas.filter((x) => x.show);
  if (!shown.length) return "";
  return `<div class="meta">${shown
    .map((x) => `<span class="meta-cell">${esc(x.label)}：${data[x.key] ?? ""}</span>`)
    .join("")}</div>`;
}

function summarize(rows: Record<string, string>[]) {
  let qtySum = 0;
  let amtSum = 0;
  let hasQty = false;
  let hasAmt = false;
  for (const r of rows) {
    if (r.qty != null && String(r.qty) !== "") {
      qtySum += parseNum(r.qty);
      hasQty = true;
    }
    const amt = r.amount ?? r.total ?? r.cost;
    if (amt != null && String(amt) !== "") {
      amtSum += parseNum(amt);
      hasAmt = true;
    }
  }
  return { qtySum, amtSum, hasQty, hasAmt, count: rows.length };
}

function parseRows(data: Record<string, string>): Record<string, string>[] {
  try {
    const rows = JSON.parse(data.rowsJson || "[]") as Record<string, string>[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function oneSheet(layout: ReportLayout, data: Record<string, string>, copyLabel: string, isContract: boolean) {
  const bits: string[] = [];
  bits.push(`<div class="sheet${isLabelPaper(layout.paper) ? " sheet-label" : ""}">`);
  bits.push(spineHtml(layout));
  if (layout.showSeal && data.shopSeal) bits.push(`<img class="shop-seal" src="${data.shopSeal}" alt="">`);
  if (copyLabel) bits.push(`<div class="copy">${esc(copyLabel)}</div>`);
  const showHead = layout.showShopName || (layout.showLogo && data.shopLogo);
  if (showHead) {
    bits.push(`<div class="headband">`);
    if (layout.showLogo && data.shopLogo) bits.push(`<img class="shop-logo" src="${data.shopLogo}" alt="">`);
    if (layout.showShopName) bits.push(`<h1 class="shop">${data.shop || ""}</h1>`);
    bits.push(`</div>`);
  }
  const contact: string[] = [];
  if (layout.showShopAddress && data.shopAddress) contact.push(data.shopAddress);
  if (layout.showShopPhone && data.shopPhone) contact.push(data.shopPhone);
  if (contact.length) bits.push(`<p style="text-align:center;margin:2px 0">${contact.join("　")}</p>`);
  bits.push(`<h2 class="ttl">${fill(esc(layout.title), data)}</h2>`);
  if (data.watermark) bits.push(`<p style="text-align:center">${data.watermark}</p>`);
  if (layout.headerNote) bits.push(`<p>${fill(esc(layout.headerNote), data).replaceAll("\n", "<br/>")}</p>`);

  if (isContract) {
    bits.push(
      `<p><b>${esc(layout.partyALabel)}</b>：${data.customer || ""}<br/>联系人：${data.contact || ""}　电话：${data.phone || ""}<br/>地址：${data.address || ""}<br/>开票资料：${data.invoiceInfo || ""}</p>`,
    );
    bits.push(`<p><b>${esc(layout.partyBLabel)}</b>：${data.shop || ""}<br/>地址：${data.shopAddress || ""}　电话：${data.shopPhone || ""}</p>`);
    if (layout.intro) bits.push(`<p>${fill(esc(layout.intro), data).replaceAll("\n", "<br/>")}</p>`);
    bits.push(metaHtml(layout, data));
    for (const c of layout.clauses) {
      bits.push(`<div class="clause"><h3>${esc(c.title)}</h3><p>${fill(esc(c.body), data).replaceAll("\n", "<br/>")}</p></div>`);
    }
    const hasTable = !isLabelPaper(layout.paper) && layout.showSchedules && layout.cols.some((c) => c.show);
    if (hasTable) bits.push(tableHtml(layout, data));
    if (!isLabelPaper(layout.paper)) bits.push(sumlineHtml(layout, data, !hasTable));
  } else {
    bits.push(metaHtml(layout, data));
    const hasTable = !isLabelPaper(layout.paper) && layout.cols.some((c) => c.show);
    if (hasTable) bits.push(tableHtml(layout, data));
    if (!isLabelPaper(layout.paper)) bits.push(sumlineHtml(layout, data, !hasTable));
  }

  if (layout.showRemark && data.remark) bits.push(`<p>备注：${data.remark}</p>`);
  if (layout.footerNote) bits.push(`<p>${fill(esc(layout.footerNote), data).replaceAll("\n", "<br/>")}</p>`);
  if (layout.signs.length && !isLabelPaper(layout.paper)) {
    bits.push(`<div class="signs">${layout.signs.map((s) => `<span>${esc(s.label)}：________</span>`).join("")}</div>`);
  }
  bits.push(`</div>`);
  return bits.join("");
}

const NUM_COLS = new Set(["qty", "price", "amount", "cost", "total", "received", "open", "material", "service"]);
const SUM_COLS = new Set(["qty", "amount", "cost", "total", "received", "open", "material", "service"]);

function sumlineHtml(layout: ReportLayout, data: Record<string, string>, showQtyAmt: boolean) {
  const rows = parseRows(data);
  const sum = summarize(rows);
  const bits: string[] = [];
  if (showQtyAmt) {
    bits.push(`数量合计：${sum.hasQty ? fmtQty(sum.qtySum) : String(sum.count)}`);
    const moneyCol = layout.cols.some((c) => c.show && (c.key === "price" || c.key === "amount" || c.key === "cost"));
    if (moneyCol) {
      bits.push(`金额合计：¥${sum.hasAmt ? fmtAmt(sum.amtSum) : data.amount || data.total || "0.00"}`);
    }
  }
  if (layout.showAmountCn && (data.totalCn || data.openCn || data.amountCn)) {
    bits.push(`合计（大写）：${data.totalCn || data.openCn || data.amountCn}`);
  }
  if (data.open && layout.title.includes("对账")) bits.push(`应付余额 ¥${data.open}`);
  if (layout.showTax && data.taxInvoice) bits.push(data.taxInvoice);
  if (!bits.length) return "";
  return `<div class="sumline">${bits.map((t) => `<span>${t}</span>`).join("")}</div>`;
}

function tableHtml(layout: ReportLayout, data: Record<string, string>) {
  const cols = layout.cols.filter((c) => c.show);
  if (!cols.length) return "";
  const rows = parseRows(data);
  const weightSum = cols.reduce((s, c) => s + itemWidth(c), 0);
  const pct = (c: LayoutItem) => ((itemWidth(c) / weightSum) * 100).toFixed(2);
  const colgroup = `<colgroup>${cols.map((c) => `<col style="width:${pct(c)}%">`).join("")}</colgroup>`;
  const head = `<tr>${cols.map((c) => `<th style="width:${pct(c)}%">${esc(c.label)}</th>`).join("")}</tr>`;
  const body =
    rows.length === 0
      ? `<tr><td colspan="${cols.length}" style="text-align:center;color:#888">（无明细）</td></tr>`
      : rows
          .map(
            (r) =>
              `<tr>${cols
                .map((c) => `<td class="${NUM_COLS.has(c.key) ? "num" : ""}">${r[c.key] ?? ""}</td>`)
                .join("")}</tr>`,
          )
          .join("");
  let foot = "";
  if (rows.length) {
    const firstText = cols.findIndex((c) => !SUM_COLS.has(c.key));
    const cells = cols.map((c, i) => {
      if (SUM_COLS.has(c.key)) {
        const n = rows.reduce((s, r) => s + parseNum(r[c.key]), 0);
        const txt = c.key === "qty" ? fmtQty(n) : fmtAmt(n);
        return `<td class="num">${txt}</td>`;
      }
      if (i === (firstText >= 0 ? firstText : 0)) return `<td>合计</td>`;
      return `<td></td>`;
    });
    foot = `<tfoot><tr>${cells.join("")}</tr></tfoot>`;
  }
  return `<table class="rpt-tbl" style="width:100%;min-width:100%;table-layout:fixed;border-collapse:collapse">${colgroup}<thead>${head}</thead><tbody>${body}</tbody>${foot}</table>`;
}

export function renderLayoutHtml(layout: ReportLayout, data: Record<string, string> | Record<string, string>[]) {
  const list = Array.isArray(data) ? data : [data];
  const ncr = layout.paper === "210x140";
  const compact = isLabelPaper(layout.paper);
  const copies = ncr || compact ? 1 : Math.max(1, Math.min(3, Number(layout.copies) || 1));
  const labels = ncr || compact ? [""] : layout.copyLabels.length ? layout.copyLabels : ["正本"];
  const isContract = layout.clauses.length > 0;
  const sheets: string[] = [];
  for (const item of list) {
    for (let i = 0; i < copies; i++) {
      const label = ncr || compact ? "" : labels[i] || `第${i + 1}联`;
      sheets.push(oneSheet(layout, item, label, isContract));
    }
  }
  return `<style>${pageCss(layout)}</style>${sheets.join("")}`;
}

export const PREVIEW_ROWS: Record<string, string>[] = [
  {
    name: "希捷酷鱼",
    brand: "希捷",
    spec: "1TB SATA",
    code: "ST-1T",
    unit: "台",
    qty: "2",
    price: "640.00",
    amount: "1,280.00",
    serial: "—",
    remark: "",
    cost: "500.00",
    date: "2026-08-12",
    sourceNo: "SO-20260001",
    typeLabel: "销售单",
    content: "希捷酷鱼 1TB×2",
    material: "1,000.00",
    service: "280.00",
    total: "1,280.00",
    received: "200.00",
    open: "1,080.00",
  },
  {
    name: "组装内存",
    brand: "金士顿",
    spec: "16G DDR4",
    code: "KJ-16",
    unit: "条",
    qty: "4",
    price: "150.00",
    amount: "600.00",
    serial: "—",
    remark: "",
    cost: "120.00",
    date: "2026-08-20",
    sourceNo: "WO-20260008",
    typeLabel: "工单",
    content: "金士顿 16G×4",
    material: "600.00",
    service: "0.00",
    total: "600.00",
    received: "0.00",
    open: "600.00",
  },
];

export const PREVIEW_DATA: Record<string, string> = {
  shop: "示例电脑店",
  shopAddress: "示例路 1 号",
  shopPhone: "13800000000",
  shopLogo: "",
  shopSeal: "",
  docNo: "DEMO-001",
  customer: "示例客户",
  contact: "张三",
  phone: "13900000000",
  address: "示例收货地址",
  settlement: "月结",
  date: "2026-09-12",
  total: "1,280.00",
  totalCn: "壹仟贰佰捌拾元整",
  watermark: "",
  remark: "预览样例",
  taxInvoice: "含税 · 带普票",
  period: "2026-08-01 至 2026-08-31",
  received: "200.00",
  open: "1,080.00",
  openCn: "壹仟零捌拾元整",
  material: "1,000.00",
  service: "280.00",
  printDate: "2026-09-12",
  title: "监控安装",
  invoiceInfo: "抬头 示例公司",
  invoiceText: "本单开具增值税普通发票",
  taxText: "价款为含税价",
  amount: "8,000.00",
  amountCn: "捌仟元整",
  duration: "签订后 15 日内完工",
  warrantyMonths: "12",
  signDate: "2026-09-12",
  modelName: "办公主机",
  labor: "150.00",
  process: "上门检测",
  supplier: "示例供应商",
  method: "微信",
  name: "希捷酷鱼 1TB SATA",
  serial: "SN-HDD-001",
  warranty: "2027-09-12",
  rowsJson: JSON.stringify(PREVIEW_ROWS),
};
