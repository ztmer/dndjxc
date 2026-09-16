import { BuildForm } from "@/components/forms/build-form";
import { customerOpts, productOpts } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { listDiyKits } from "@/lib/diy-kits";

export const dynamic = "force-dynamic";

export default async function NewBuildPage({ searchParams }: { searchParams: Promise<{ customerId?: string; kit?: string }> }) {
  const { customerId, kit } = await searchParams;
  const [customers, products, kits] = await Promise.all([customerOpts(), productOpts(), listDiyKits()]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="新建组装配置单" description="填配件报价，可暂存。确认出库才扣库存并生成销售单。" />
      <Card>
        <CardContent className="pt-6">
          <BuildForm customers={customers} products={products} kits={kits} defaultCustomerId={customerId} defaultKit={kit} />
        </CardContent>
      </Card>
    </div>
  );
}
