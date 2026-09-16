import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { SupplierForm } from "@/components/forms/supplier-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyHint } from "@/components/empty-hint";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ edit?: string; page?: string }> }) {
  const { edit, page: pageRaw } = await searchParams;
  const total = await prisma.supplier.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.supplier.findMany({ orderBy: { name: "asc" }, skip, take });
  const editing = edit ? await prisma.supplier.findUnique({ where: { id: edit } }) : undefined;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="供应商" description="批发商：名称、联系人、电话、地址、备注。采购入库时选择。" />
      <Card>
        <CardHeader>
          <CardTitle>{editing ? `编辑 ${editing.name}` : "新建供应商"}</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            supplier={
              editing
                ? {
                    id: editing.id,
                    name: editing.name,
                    contactName: editing.contactName,
                    phone: editing.phone,
                    address: editing.address,
                    remark: editing.remark,
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>
      {total === 0 ? (
        <EmptyHint title="还没有供应商" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>电话</TableHead>
                <TableHead>地址</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.contactName || "—"}</TableCell>
                  <TableCell>{r.phone || "—"}</TableCell>
                  <TableCell className="max-w-56 truncate">{r.address || "—"}</TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">{r.remark || "—"}</TableCell>
                  <TableCell>
                    <Link className={cn(buttonVariants({ variant: "ghost", size: "sm" }))} href={`/suppliers?edit=${r.id}`}>
                      编辑
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPager path="/suppliers" page={page} total={total} query={{ edit }} />
        </Card>
      )}
    </div>
  );
}
