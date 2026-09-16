export const VISIT_TYPE = {
  onsite: "上门",
  instore: "到店",
  outsource: "委外",
} as const;

export const SETTLEMENT = {
  cash: "现金",
  monthly: "月结",
  yearly: "年结",
} as const;

export const AR_SOURCE = {
  salesOrder: "销售",
  workOrder: "工单",
  contract: "合同",
  buildConfig: "组装",
} as const;

export const PAY_METHOD = {
  cash: "现金",
  wechat: "微信",
  alipay: "支付宝",
  transfer: "转账",
} as const;

export const DOC_STATUS = {
  draft: "草稿",
  submitted: "已完成",
  confirmed: "已确认",
  voided: "已作废",
} as const;

export const SN_STATUS = {
  in_stock: "在库",
  sold: "已售",
  installed: "已安装",
  returned: "已退回",
  scrapped: "报废",
  rma: "返厂中",
} as const;

export const PROJECT_PROGRESS = {
  not_started: "未开工",
  in_progress: "施工中",
  accepted: "已验收",
  in_warranty: "质保中",
} as const;

export const INVOICE_TYPE = {
  "": "不开票",
  plain: "增值税普通发票",
  special: "增值税专用发票",
} as const;

export const ISSUE_REASON = {
  self_use: "自用",
  scrap: "报损",
  gift: "赠送",
} as const;

export const PRODUCT_UNITS = ["件", "台", "块", "条", "盒", "套", "个", "米", "卷", "次", "小时", "根", "箱", "支", "包"] as const;

export const NET_DEVICE_KIND = {
  switch: "交换机",
  router: "路由器",
  firewall: "防火墙",
  wlc: "无线控制器",
  onu: "光猫/ONU",
  ap: "无线AP",
  other: "其他",
} as const;

export const NET_VENDOR = {
  huawei: "华为",
  h3c: "华三",
  ruijie: "锐捷",
  cisco: "思科",
  zte: "中兴",
  tplink: "TP-LINK",
  hikvision: "海康",
  other: "其他",
} as const;

export const NET_PROTOCOL = {
  ssh: "SSH",
  telnet: "Telnet",
  http: "HTTP/Web",
} as const;

export function label(map: Record<string, string>, key: string) {
  return map[key] ?? key;
}
