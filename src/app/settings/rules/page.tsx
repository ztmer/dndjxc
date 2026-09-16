import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ShopBizForm } from "@/components/forms/shop-biz-form";
import { getShopBiz } from "@/lib/shop-biz";

export const dynamic = "force-dynamic";

export default async function RulesSettingsPage() {
  const cfg = await getShopBiz();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="开单规则" description="出库是否扫 SN；期初可补旧单（只记账不走库存）。" />
      <Card>
        <CardContent className="pt-6">
          <ShopBizForm forceOutboundSn={cfg.forceOutboundSn} openingMode={cfg.openingMode} />
        </CardContent>
      </Card>
    </div>
  );
}
