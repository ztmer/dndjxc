import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DiyKitManager } from "@/components/forms/diy-kit-form";
import { listDiyKits } from "@/lib/diy-kits";
import { productOpts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function KitsSettingsPage() {
  const [kits, products] = await Promise.all([listDiyKits(true), productOpts()]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="组装套餐" description="配件从本店商品里按分类选。新建配置里点「从套餐带入」就能用。" />
      <Card>
        <CardContent className="pt-6">
          <DiyKitManager kits={kits} products={products} />
        </CardContent>
      </Card>
    </div>
  );
}
