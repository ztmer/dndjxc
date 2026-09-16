import { OtherStockForm } from "@/components/forms/other-stock-form";
import { productOpts } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewOtherIssuePage() {
  const products = await productOpts();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="其它出库" description="自用、报损、赠送，不产生客户应收。" />
      <Card>
        <CardContent className="pt-6">
          <OtherStockForm products={products} mode="out" />
        </CardContent>
      </Card>
    </div>
  );
}
