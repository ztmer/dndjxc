import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { WecomForm } from "@/components/forms/wecom-form";

export const dynamic = "force-dynamic";

export default async function WecomSettingsPage() {
  const cfg = await prisma.wecomSetting.findUnique({ where: { id: "default" } });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="企业微信" description="可选销售单、工单、送货单、合同、装机单，做成图片发到企业微信群。装机单不显示单价。" />
      <Card>
        <CardContent className="pt-6">
          <WecomForm cfg={cfg} />
        </CardContent>
      </Card>
    </div>
  );
}
