import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyForm } from "@/components/forms/settings-forms";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  const company = await prisma.company.findUnique({ where: { id: "default" } });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="公司信息" description="打印抬头、联系方式和开票资料。Logo、公章用于送货单、对账单、合同，可在报表格式里开关。" />
      <Card>
        <CardContent className="pt-6">
          <CompanyForm company={company} />
        </CardContent>
      </Card>
    </div>
  );
}
