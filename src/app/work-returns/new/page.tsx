import { WorkReturnForm } from "@/components/forms/return-forms";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { qty } from "@/lib/money";
import { EmptyHint } from "@/components/empty-hint";

export const dynamic = "force-dynamic";

export default async function NewWorkReturnPage() {
  const orders = await prisma.workOrder.findMany({
    where: { status: "submitted" },
    include: { lines: true, customer: true },
  });
  const products = await prisma.product.findMany();
  const pmap = Object.fromEntries(products.map((p) => [p.id, p.name]));
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="工单退料" description="已出库材料退回门店仓。" />
      <Card>
        <CardContent className="pt-6">
          {orders.length === 0 ? (
            <EmptyHint title="没有可退料的工单" hint="先完工一张带材料的工单。" />
          ) : (
            <WorkReturnForm
              orders={orders.map((o) => ({
                id: o.id,
                docNo: `${o.docNo} ${o.customer.name}`,
                lines: o.lines
                  .filter((l) => l.isStocked)
                  .map((l) => ({
                    id: l.id,
                    label: pmap[l.productId] ?? l.productId,
                    max: qty(l.qty.sub(l.returnedQty)),
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
