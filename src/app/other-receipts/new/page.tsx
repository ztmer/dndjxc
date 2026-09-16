import { OtherStockForm } from "@/components/forms/other-stock-form";
import { productOpts } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewOtherReceiptPage() {
  const products = await productOpts();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="其它入库" description="盘盈、调入等，不挂供应商采购单。" />
      <Card>
        <CardContent className="pt-6">
          <OtherStockForm products={products} mode="in" />
        </CardContent>
      </Card>
    </div>
  );
}
