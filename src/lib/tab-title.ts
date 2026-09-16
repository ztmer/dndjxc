/** 页签标题：按路径匹配菜单和新建/编辑页。 */
const EXACT: [string, string][] = [
  ["/", "总览"],
  ["/customers/new", "新建客户"],
  ["/customers", "客户档案"],
  ["/statements", "对账单"],
  ["/receipts/new", "新建收款"],
  ["/receipts", "收款单"],
  ["/sales/new", "新建销售"],
  ["/sales", "销售开单"],
  ["/sales-returns/new", "新建退货"],
  ["/sales-returns", "销售退货"],
  ["/builds/new", "新建配置"],
  ["/builds", "组装配置"],
  ["/work-orders/new", "新建工单"],
  ["/work-orders", "工单"],
  ["/work-returns/new", "新建退料"],
  ["/work-returns", "工单退料"],
  ["/contracts/new", "新建合同"],
  ["/contracts", "合同"],
  ["/projects/new", "新建工程"],
  ["/projects", "工程"],
  ["/labors", "临时工"],
  ["/catalog", "产品目录"],
  ["/knowledge/new", "新建知识"],
  ["/knowledge", "知识库"],
  ["/products/categories", "商品分类"],
  ["/products/brands", "商品品牌"],
  ["/m/products/new", "新建商品"],
  ["/m/products", "本店商品"],
  ["/suppliers", "供应商"],
  ["/purchase-requests", "待采购"],
  ["/purchase/new", "新建入库"],
  ["/purchase", "采购入库"],
  ["/other-receipts/new", "其它入库"],
  ["/other-receipts", "其它入库"],
  ["/other-issues/new", "其它出库"],
  ["/other-issues", "其它出库"],
  ["/stock", "门店库存"],
  ["/ledgers", "库存流水"],
  ["/serials", "SN 查询"],
  ["/reports", "明细导出"],
  ["/report-formats/new", "新增报表格式"],
  ["/report-formats", "报表格式"],
  ["/print-templates", "报表格式"],
  ["/settings/company", "公司信息"],
  ["/settings/site", "网站信息"],
  ["/settings/kits", "组装套餐"],
  ["/settings/wecom", "企业微信"],
  ["/settings/rules", "开单规则"],
  ["/settings/backup", "备份与恢复"],
  ["/settings/logs", "系统日志"],
  ["/settings", "系统设置"],
];

const PREFIX: [string, string][] = [
  ["/customers/", "客户"],
  ["/receipts/", "收款单"],
  ["/sales-returns/", "销售退货"],
  ["/sales/", "销售单"],
  ["/builds/", "配置单"],
  ["/work-returns/", "工单退料"],
  ["/work-orders/", "工单"],
  ["/contracts/", "合同"],
  ["/projects/", "工程"],
  ["/catalog/", "产品目录"],
  ["/knowledge/", "知识库"],
  ["/m/products/", "本店商品"],
  ["/products/", "本店商品"],
  ["/report-formats/", "报表格式"],
  ["/purchase/", "采购入库"],
  ["/other-receipts/", "其它入库"],
  ["/other-issues/", "其它出库"],
];

export function pathOnly(href: string) {
  return href.split("?")[0] || "/";
}

/** 同一菜单功能共用一个页签（列表/新建/详情不叠开）。 */
export function tabModuleKey(href: string) {
  const p = pathOnly(href);
  if (p === "/") return "home";
  const segs = p.split("/").filter(Boolean);
  if (segs[0] === "products" && segs[1] === "categories") return "products-categories";
  return segs[0] || "home";
}

export function tabTitle(href: string) {
  const p = pathOnly(href);
  const hit = EXACT.find(([k]) => k === p);
  if (hit) return hit[1];
  if (p.endsWith("/edit")) {
    const base = PREFIX.find(([k]) => p.startsWith(k));
    return base ? `编辑${base[1]}` : "编辑";
  }
  const pre = PREFIX.find(([k]) => p.startsWith(k));
  return pre ? pre[1] : "页面";
}
