import { WorkOrderForm } from "@/components/forms/work-order-form";
import { saveWorkOrderDraft } from "@/actions/service";
import { customerOpts, productOpts } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { parseSerials } from "@/lib/serials";

export const dynamic = "force-dynamic";

export default async function NewWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; projectId?: string; warranty?: string; salesOrderId?: string }>;
}) {
  const { customerId, projectId, warranty, salesOrderId } = await searchParams;
  const [customers, products, sites, projects, sale] = await Promise.all([
    customerOpts(),
    productOpts(),
    prisma.site.findMany(),
    prisma.project.findMany({ include: { contract: true } }),
    salesOrderId
      ? prisma.salesOrder.findUnique({
          where: { id: salesOrderId },
          include: { lines: true },
        })
      : Promise.resolve(null),
  ]);
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  const warrantyMode = warranty === "1" || !!sale || project?.progress === "in_warranty";
  const saleProducts = sale
    ? await prisma.product.findMany({
        where: { id: { in: sale.lines.map((l) => l.productId) } },
        select: { id: true, name: true },
      })
    : [];
  const saleName = Object.fromEntries(saleProducts.map((p) => [p.id, p.name]));
  const sourceSale = sale
    ? {
        docNo: sale.docNo,
        items: sale.lines.map((l) => ({
          name: saleName[l.productId] ?? "商品",
          serials: parseSerials(l.serialsJson),
        })),
      }
    : undefined;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={warrantyMode ? "售后工单" : "新建工单"}
        description={
          warrantyMode
            ? sourceSale
              ? `原销售 ${sourceSale.docNo}。材料默认保内免费；上门费、工时默认要收。`
              : "质保期内上门。材料默认保内免费；上门费、工时默认要收。"
            : project
              ? "施工工单：材料出库记交工清单，默认不另计应收。"
              : "写过程、填材料，保存草稿。零星维修可不挂工程。"
        }
      />
      <Card>
        <CardContent className="pt-6">
          <WorkOrderForm
            customers={customers}
            products={products}
            sites={sites.map((s) => ({ id: s.id, name: s.name, customerId: s.customerId }))}
            projects={projects.map((p) => ({ id: p.id, name: `${p.docNo} ${p.name}`, customerId: p.contract.customerId }))}
            defaultCustomerId={sale?.customerId ?? project?.contract.customerId ?? customerId}
            defaultProjectId={project?.id}
            warrantyMode={warrantyMode}
            sourceSale={sourceSale}
            save={saveWorkOrderDraft}
          />
        </CardContent>
      </Card>
    </div>
  );
}
