import {
  LayoutDashboardIcon,
  UsersIcon,
  ReceiptIcon,
  WalletIcon,
  ShoppingCartIcon,
  Undo2Icon,
  CpuIcon,
  WrenchIcon,
  PackageMinusIcon,
  FileTextIcon,
  FolderKanbanIcon,
  LibraryIcon,
  BookOpenIcon,
  LayersIcon,
  UserRoundIcon,
  BoxesIcon,
  TruckIcon,
  ClipboardListIcon,
  PackagePlusIcon,
  PackageIcon,
  ArrowLeftRightIcon,
  ScanLineIcon,
  FileSpreadsheetIcon,
  PrinterIcon,
  SettingsIcon,
  TagIcon,
  BookmarkIcon,
  Network as NetworkIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { title: string; items: NavItem[] };

/** 柜台顶栏常点的入口，顺序按店里手速。 */
export const COUNTER_SHORTCUTS: NavItem[] = [
  { href: "/sales/new", label: "成交", icon: ShoppingCartIcon },
  { href: "/work-orders/new", label: "工单", icon: WrenchIcon },
  { href: "/customers", label: "客户", icon: UsersIcon },
  { href: "/stock", label: "库存", icon: BoxesIcon },
  { href: "/receipts/new", label: "收款", icon: WalletIcon },
  { href: "/contracts/new", label: "合同", icon: FileTextIcon },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "工作台",
    items: [{ href: "/", label: "总览", icon: LayoutDashboardIcon }],
  },
  {
    title: "客户",
    items: [
      { href: "/customers", label: "客户档案", icon: UsersIcon },
      { href: "/network", label: "客户网络", icon: NetworkIcon },
      { href: "/statements", label: "对账单", icon: ReceiptIcon },
      { href: "/receipts", label: "收款单", icon: WalletIcon },
    ],
  },
  {
    title: "销售",
    items: [
      { href: "/sales", label: "销售开单", icon: ShoppingCartIcon },
      { href: "/sales-returns", label: "销售退货", icon: Undo2Icon },
      { href: "/builds", label: "组装配置", icon: CpuIcon },
    ],
  },
  {
    title: "维修与工程",
    items: [
      { href: "/work-orders", label: "工单", icon: WrenchIcon },
      { href: "/work-returns", label: "工单退料", icon: PackageMinusIcon },
      { href: "/contracts", label: "合同", icon: FileTextIcon },
      { href: "/projects", label: "工程", icon: FolderKanbanIcon },
      { href: "/labors", label: "临时工", icon: UserRoundIcon },
    ],
  },
  {
    title: "资料",
    items: [
      { href: "/catalog", label: "产品目录", icon: LibraryIcon },
      { href: "/knowledge", label: "知识库", icon: BookOpenIcon },
    ],
  },
  {
    title: "仓库",
    items: [
      { href: "/stock", label: "门店库存", icon: BoxesIcon },
      { href: "/serials", label: "SN 查询", icon: ScanLineIcon },
      { href: "/ledgers", label: "库存流水", icon: ArrowLeftRightIcon },
      { href: "/purchase-requests", label: "待采购", icon: ClipboardListIcon },
      { href: "/purchase", label: "采购入库", icon: PackagePlusIcon },
      { href: "/other-receipts", label: "其它入库", icon: PackageIcon },
      { href: "/other-issues", label: "其它出库", icon: PackageMinusIcon },
      { href: "/products", label: "本店商品", icon: TagIcon },
      { href: "/products/categories", label: "商品分类", icon: LayersIcon },
      { href: "/products/brands", label: "商品品牌", icon: BookmarkIcon },
      { href: "/suppliers", label: "供应商", icon: TruckIcon },
    ],
  },
  {
    title: "报表与系统",
    items: [
      { href: "/reports", label: "明细导出", icon: FileSpreadsheetIcon },
      { href: "/report-formats", label: "报表格式", icon: PrinterIcon },
      { href: "/settings", label: "系统设置", icon: SettingsIcon },
    ],
  },
];

export function navItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/sales/new") return pathname === "/sales/new";
  if (href === "/work-orders/new") return pathname === "/work-orders/new";
  if (href === "/contracts/new") return pathname === "/contracts/new";
  if (href === "/receipts/new") return pathname === "/receipts/new";
  if (href === "/products") {
    return (
      pathname === "/products" ||
      (pathname.startsWith("/products/") && !pathname.startsWith("/products/categories") && !pathname.startsWith("/products/brands"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function groupHasActive(pathname: string, items: { href: string }[]) {
  return items.some((it) => navItemActive(pathname, it.href));
}
