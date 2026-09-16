import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const items = [
    { href: "/api/export/sales", label: "销售明细", hint: "开单明细，含客户与金额" },
    { href: "/api/export/work-orders", label: "工单明细", hint: "材料、增项、状态" },
    { href: "/api/export/stock", label: "库存明细", hint: "门店仓结存" },
    { href: "/api/export/ledgers", label: "库存流水", hint: "唯一账本导出" },
    { href: "/api/export/labors", label: "临时工成本", hint: "不进客户对账单" },
  ];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="明细导出" description="Excel 给会计对账。送货单/对账单/合同的纸张版式在「报表格式」里自己改。" />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Card key={it.href}>
            <CardHeader>
              <CardTitle>{it.label}</CardTitle>
              <CardDescription>{it.hint}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link className={cn(buttonVariants())} href={it.href}>
                下载 Excel
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        打印版式请到{" "}
        <Link className="text-primary" href="/report-formats">
          报表格式
        </Link>
        新增或修改。
      </p>
    </div>
  );
}
