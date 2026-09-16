import { SalesReturnForm } from "@/components/forms/return-forms";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { qty, money } from "@/lib/money";
import { EmptyHint } from "@/components/empty-hint";

export const dynamic = "force-dynamic";

export default async function NewSalesReturnPage({ searchParams }: { searchParams: Promise<{ salesOrderId?: string }> }) {
  const { salesOrderId } = await searchParams;
  const orders = await prisma.salesOrder.findMany({
    where: { status: "submitted" },
    include: { lines: true, customer: true },
  });
  const products = await prisma.product.findMany();
  const pmap = Object.fromEntries(products.map((p) => [p.id, p.name]));
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="销售退货" description="按已开单销售单退回门店仓，并冲减应收。" />
      <Card>
        <CardContent className="pt-6">
          {orders.length === 0 ? (
            <EmptyHint title="没有可退的销售单" hint="先开一张已完成的销售单。" />
          ) : (
            <SalesReturnForm
              defaultOrderId={salesOrderId}
              orders={orders.map((o) => ({
                id: o.id,
                docNo: `${o.docNo} ${o.customer.name}`,
                lines: o.lines.map((l) => ({
                  id: l.id,
                  label: pmap[l.productId] ?? l.productId,
                  max: qty(l.qty.sub(l.returnedQty)),
                  price: money(l.price),
                  unit: products.find((p) => p.id === l.productId)?.unit,
                })),
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
