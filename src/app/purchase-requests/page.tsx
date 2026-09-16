import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { qty } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function PrPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const total = await prisma.purchaseRequest.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.purchaseRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { lines: true },
    skip,
    take,
  });
  const productIds = [...new Set(rows.flatMap((r) => r.lines.map((l) => l.productId)))];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, unit: true } })
    : [];
  const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="待采购" description="开单缺货时自动生成。采购入库后，原销售/工单才能出库。" />
      {total === 0 ? (
        <EmptyHint title="没有待采购" hint="销售或工单缺货时会出现。" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>明细</TableHead>
                <TableHead>状态</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.docNo}</TableCell>
                  <TableCell>
                    {r.sourceNo} ({r.sourceType})
                  </TableCell>
                  <TableCell>
                    {r.lines
                      .map((l) => {
                        const p = pmap[l.productId];
                        const u = p?.unit ? p.unit : "";
                        return `${p?.name ?? l.productId}×${qty(l.qty)}${u ? ` ${u}` : ""}`;
                      })
                      .join("，")}
                  </TableCell>
                  <TableCell>
                    {r.status === "open" ? (
                      <Badge variant="destructive">未完成</Badge>
                    ) : r.status === "filled" ? (
                      <Badge>已入库</Badge>
                    ) : (
                      <Badge variant="secondary">取消</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.status === "open" ? (
                      <Link className={buttonVariants({ size: "sm" })} href={`/purchase/new?pr=${r.id}`}>
                        入库
                      </Link>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/purchase-requests" page={page} total={total} />
        </Card>
      )}
    </div>
  );
}
