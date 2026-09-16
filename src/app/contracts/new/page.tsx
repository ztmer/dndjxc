import { ContractForm } from "@/components/forms/contract-form";
import { customerOpts } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = await searchParams;
  const customers = await customerOpts();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="新建合同"
        description="填项目、金额、含税带票、收款计划。可暂存报价；点下单后合同额进应收。之后建工程 → 施工工单 → 验收 → 结款 → 质保售后。"
      />
      <Card>
        <CardContent className="pt-6">
          <ContractForm customers={customers} defaultCustomerId={customerId} />
        </CardContent>
      </Card>
    </div>
  );
}
