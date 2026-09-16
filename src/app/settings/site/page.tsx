import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SiteForm } from "@/components/forms/settings-forms";

export const dynamic = "force-dynamic";

export default async function SiteSettingsPage() {
  const site = await prisma.siteSetting.findUnique({ where: { id: "default" } });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="网站信息" description="网站名称会出现在登录页和左侧菜单。Logo 在公司信息里上传。" />
      <Card>
        <CardContent className="pt-6">
          <SiteForm site={site} />
        </CardContent>
      </Card>
    </div>
  );
}
