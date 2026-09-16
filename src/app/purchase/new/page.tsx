import { PurchaseForm } from "@/components/forms/purchase-form";
import { savePurchaseReceiptDraft } from "@/actions/warehouse";
import { productOpts } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { qty } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage({ searchParams }: { searchParams: Promise<{ pr?: string }> }) {
  const { pr } = await searchParams;
  const [products, suppliers, prDoc] = await Promise.all([
    productOpts(),
    prisma.supplier.findMany(),
    pr ? prisma.purchaseRequest.findUnique({ where: { id: pr }, include: { lines: true } }) : Promise.resolve(null),
  ]);
  const productsAll = await prisma.product.findMany();
  const pmap = Object.fromEntries(productsAll.map((p) => [p.id, p.name]));
  const openPrLines =
    prDoc?.lines.map((l) => ({
      id: l.id,
      label: `${prDoc.docNo} ${pmap[l.productId]}`,
      productId: l.productId,
      qty: qty(l.qty.sub(l.filledQty)),
    })) ?? [];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="采购入库"
        description="硬盘这类货：商品资料只建一条。一次进 10 块，数量 10，再扫 10 个唯一 SN。确认入库后才知道谁卖给我。"
      />
      <Card>
        <CardContent className="pt-6">
          <PurchaseForm suppliers={suppliers} products={products} openPrLines={openPrLines} save={savePurchaseReceiptDraft} />
        </CardContent>
      </Card>
    </div>
  );
}
