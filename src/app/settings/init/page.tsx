import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SystemInitForm } from "@/components/forms/system-init-form";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SystemInitPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "owner") {
    return <p className="text-sm text-muted-foreground">系统初始化只有店主能用。</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="系统初始化" description="可只补缺；也可勾选清空单据、客户资料、供应商资料。分类、品牌、知识库、本店商品会保留。" />
      <Card>
        <CardContent className="pt-6">
          <SystemInitForm />
        </CardContent>
      </Card>
    </div>
  );
}
