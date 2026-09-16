import { CustomerForm } from "@/components/forms/customer-form";
import { CustomerNetworkSection } from "@/components/customer-network-section";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sites: true,
      broadbandAccounts: { orderBy: { updatedAt: "desc" } },
      netDevices: { orderBy: { updatedAt: "desc" } },
      ipAddrs: { orderBy: { address: "asc" } },
      wifiNetworks: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!customer) notFound();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="编辑客户" description={`${customer.code} ${customer.name}`} />
      <Card>
        <CardContent className="pt-6">
          <CustomerForm
            customer={{
              id: customer.id,
              code: customer.code,
              name: customer.name,
              contactName: customer.contactName,
              phone: customer.phone,
              address: customer.address,
              isWalkIn: customer.isWalkIn,
              settlement: customer.settlement,
              remark: customer.remark,
              needInvoice: customer.needInvoice,
              invoiceTitle: customer.invoiceTitle,
              taxNo: customer.taxNo,
              invoiceBank: customer.invoiceBank,
              invoiceAccount: customer.invoiceAccount,
              invoiceAddress: customer.invoiceAddress,
              invoicePhone: customer.invoicePhone,
              priceMemory: customer.priceMemory,
              sites: customer.sites.map((s) => ({ id: s.id, name: s.name, address: s.address })),
            }}
          />
        </CardContent>
      </Card>
      <CustomerNetworkSection
        customerId={customer.id}
        sites={customer.sites.map((s) => ({ id: s.id, name: s.name }))}
        accounts={customer.broadbandAccounts}
        devices={customer.netDevices}
        ips={customer.ipAddrs}
        wifis={customer.wifiNetworks}
      />
    </div>
  );
}
