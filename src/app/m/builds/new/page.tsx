import { BuildForm } from "@/components/forms/build-form";
import { customerOpts, productOpts } from "@/lib/queries";
import { listDiyKits } from "@/lib/diy-kits";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function MobileNewBuildPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; kit?: string }>;
}) {
  const { customerId, kit } = await searchParams;
  const [customers, products, kits] = await Promise.all([customerOpts(), productOpts(), listDiyKits()]);
  return (
    <Card>
      <CardContent className="pt-4">
        <BuildForm
          customers={customers}
          products={products}
          kits={kits}
          defaultCustomerId={customerId}
          defaultKit={kit}
          detailHref="/m/builds/:id"
        />
      </CardContent>
    </Card>
  );
}
