import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyHint } from "@/components/empty-hint";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PAPER_OPTIONS, bizLabel } from "@/lib/report-formats";
import { ReportFormatActions } from "@/components/report-format-actions";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function ReportFormatsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const total = await prisma.reportFormat.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.reportFormat.findMany({
    orderBy: [{ bizType: "asc" }, { name: "asc" }],
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="报表格式"
          description="自己改标题、栏位、签字和合同条款。送货单用 210×140；保修箱贴用 70×50mm 标签。"
        />
        <Link className={cn(buttonVariants())} href="/report-formats/new">
          新增格式
        </Link>
      </div>
      <Card className="py-0">
        {total === 0 ? (
          <div className="p-6">
            <EmptyHint title="还没有格式" hint="点「新增格式」，勾选要印的栏位即可。" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>业务</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>纸张</TableHead>
                <TableHead>默认</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{bizLabel(r.bizType)}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{PAPER_OPTIONS.find((p) => p.value === r.paper)?.label ?? r.paper}</TableCell>
                  <TableCell>{r.isDefault ? <Badge>默认</Badge> : ""}</TableCell>
                  <TableCell className="max-w-[12rem] truncate text-muted-foreground">{r.remark || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={`/report-formats/${r.id}/edit`}>
                        修改
                      </Link>
                      <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={`/report-formats/${r.id}/preview`}>
                        预览
                      </Link>
                      <ReportFormatActions id={r.id} isDefault={r.isDefault} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <ListPager path="/report-formats" page={page} total={total} />
      </Card>
    </div>
  );
}
