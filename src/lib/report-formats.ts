/** 报表/单据版式：业务类型、纸张、占位符说明。 */

export const REPORT_BIZ_TYPES: { value: string; label: string }[] = [
  { value: "salesOrder", label: "销售小票" },
  { value: "deliveryNote", label: "送货单" },
  { value: "statement", label: "对账单" },
  { value: "contract", label: "工程合同" },
  { value: "buildConfig", label: "组装配置清单" },
  { value: "installSheet", label: "装机单" },
  { value: "workOrder", label: "工单" },
  { value: "purchaseReceipt", label: "采购入库" },
  { value: "receipt", label: "收款单" },
  { value: "warrantyLabel", label: "保修箱贴" },
];

export const PAPER_OPTIONS: { value: string; label: string }[] = [
  { value: "A4", label: "A4（对账单、合同）" },
  { value: "210x140", label: "210×140mm 二等份（送货单多层纸）" },
  { value: "ticket", label: "80mm 小票" },
  { value: "70x50", label: "70×50mm 标签（保修箱贴）" },
];

export function isLabelPaper(paper: string) {
  return paper === "70x50";
}

export function paperPageSize(paper: string) {
  if (paper === "210x140") return "210mm 140mm";
  if (paper === "ticket") return "80mm auto";
  if (paper === "70x50") return "70mm 50mm";
  return "A4";
}

export function paperForBiz(bizType: string) {
  if (bizType === "deliveryNote") return "210x140";
  if (bizType === "salesOrder" || bizType === "receipt") return "ticket";
  if (bizType === "warrantyLabel") return "70x50";
  return "A4";
}

export function paperHint(paper: string) {
  if (paper === "210x140") return "210×140mm 二等份多层纸，只打一页（下面几层靠复写）";
  if (paper === "ticket") return "80mm 小票纸";
  if (paper === "70x50") return "70×50mm 热敏标签（保修箱贴）";
  return "A4";
}

export function paperPreviewMaxWidth(paper: string) {
  if (paper === "70x50") return "70mm";
  if (paper === "ticket") return "80mm";
  return "210mm";
}

export function bizLabel(bizType: string) {
  return REPORT_BIZ_TYPES.find((b) => b.value === bizType)?.label ?? bizType;
}

export const PLACEHOLDER_HINT =
  "常用占位符：{{shop}} {{shopAddress}} {{shopPhone}} {{docNo}} {{customer}} {{phone}} {{address}} {{date}} {{settlement}} {{total}} {{totalCn}} {{lines}} {{deliveryLines}} {{remark}} {{watermark}} {{taxInvoice}}。对账单另有 {{period}} {{open}} {{openCn}} {{schedules}}。合同另有 {{title}} {{amountCn}} {{invoiceText}} {{warrantyMonths}}。";

export const PREVIEW_SAMPLE: Record<string, string> = {
  shop: "示例电脑店",
  shopAddress: "示例路 1 号",
  shopPhone: "13800000000",
  docNo: "DEMO-001",
  customer: "示例客户",
  contact: "张三",
  phone: "13900000000",
  address: "示例收货地址",
  settlement: "月结",
  status: "已审核",
  date: "2026-09-12",
  total: "1,280.00",
  totalCn: "壹仟贰佰捌拾元整",
  watermark: "",
  remark: "预览样例，非正式单据",
  taxInvoice: "含税 · 带普票",
  lines: "<tr><td>示例商品</td><td>2</td><td>640.00</td><td>1,280.00</td></tr>",
  deliveryLines:
    "<tr><td>示例商品 规格</td><td>台</td><td style='text-align:right'>2</td><td style='text-align:right'>640.00</td><td style='text-align:right'>1,280.00</td><td>—</td></tr>",
  period: "2026-08-01 至 2026-08-31",
  received: "200.00",
  open: "1,080.00",
  openCn: "壹仟零捌拾元整",
  material: "1,000.00",
  service: "280.00",
  printDate: "2026-09-12",
  title: "监控安装工程承包合同",
  invoiceInfo: "抬头 示例公司；税号 91320000XXXX",
  invoiceText: "本单开具增值税普通发票，资料以甲方档案为准",
  taxText: "价款为含税价",
  amount: "8,000.00",
  amountCn: "捌仟元整",
  duration: "合同签订后 15 日内完工",
  warrantyMonths: "12",
  signDate: "2026-09-12",
  schedules: "<tr><td>订金</td><td style='text-align:right'>2000.00</td><td>2026-09-12</td></tr>",
  modelName: "办公主机",
  labor: "150.00",
  process: "上门检测、更换配件",
  supplier: "示例供应商",
  method: "微信",
};
