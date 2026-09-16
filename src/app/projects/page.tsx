import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { PROJECT_PROGRESS, label } from "@/lib/labels";
import { AcceptButton } from "@/components/accept-project";
import { PageHeader } from "@/components/page-header";
import { EmptyHint } from "@/components/empty-hint";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import Link from "next/link";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const total = await prisma.project.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.project.findMany({
    include: { contract: { include: { customer: true } } },
    orderBy: { docNo: "desc" },
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="工程" description="必须已下单合同。开工 → 施工工单 → 验收进入质保 → 售后工单。" actionHref="/projects/new" actionLabel="新建工程" />
      {rows.length === 0 ? (
        <EmptyHint title="还没有工程" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单号</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>合同</TableHead>
                <TableHead>进度</TableHead>
                <TableHead>质保截止</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link className="font-medium text-primary" href={`/projects/${r.id}`}>
                      {r.docNo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/projects/${r.id}`}>{r.name}</Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/contracts/${r.contractId}`}>
                      {r.contract.docNo} / {r.contract.customer.name}
                    </Link>
                  </TableCell>
                  <TableCell>{label(PROJECT_PROGRESS, r.progress)}</TableCell>
                  <TableCell>{r.warrantyEnd ? formatDate(r.warrantyEnd) : "—"}</TableCell>
                  <TableCell>{r.progress !== "in_warranty" ? <AcceptButton id={r.id} /> : null}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/projects" page={page} total={total} />
        </Card>
      )}
    </div>
  );
}
