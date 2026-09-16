import { ProjectForm } from "@/components/forms/contract-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { EmptyHint } from "@/components/empty-hint";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ contractId?: string }> }) {
  const { contractId } = await searchParams;
  const [contracts, sites] = await Promise.all([
    prisma.contract.findMany({ where: { status: "submitted" }, include: { customer: true } }),
    prisma.site.findMany(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="新建工程" description="挂已下单合同。建好后开工，再开施工工单；验收后进入质保售后。" />
      <Card>
        <CardContent className="pt-6">
          {contracts.length === 0 ? (
            <EmptyHint title="没有已下单合同" hint="先在合同页点下单，再来建工程。" />
          ) : (
            <ProjectForm
              defaultContractId={contractId}
              contracts={contracts.map((c) => ({
                id: c.id,
                customerId: c.customerId,
                label: `${c.docNo} ${c.customer.name} ${c.title}`,
              }))}
              sites={sites.map((s) => ({ id: s.id, name: s.name, customerId: s.customerId }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
