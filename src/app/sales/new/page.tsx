import { SalesForm } from "@/components/forms/sales-form";
import { saveSalesDraft } from "@/actions/sales";
import { customerOpts, productOpts } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewSalesPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = await searchParams;
  const [customers, products] = await Promise.all([customerOpts(), productOpts()]);
  const picked = customers.find((c) => c.id === customerId);
  const walkIn = picked?.isWalkIn ?? customers[0]?.isWalkIn;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="销售开单"
        description={
          walkIn
            ? "散客：填商品点成交收款，一次出库并收款。缺货不能开、不转待采购。"
            : "报价可暂存。谈妥点开单：有货出库，现金当场收；月结进对账单。没货出待采购。"
        }
      />
      <Card>
        <CardContent className="pt-6">
          <SalesForm
            customers={customers}
            products={products}
            defaultCustomerId={picked?.id}
            defaultSettlement={picked?.settlement}
            save={saveSalesDraft}
          />
        </CardContent>
      </Card>
    </div>
  );
}
