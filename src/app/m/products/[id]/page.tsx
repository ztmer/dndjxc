import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/forms/product-form";
import { PageHeader } from "@/components/page-header";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { userCanSeeCost } from "@/lib/auth-shared";
import { listProductBrandNames } from "@/lib/ensure-product-brands";

export const dynamic = "force-dynamic";

export default async function MobileEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSession(`/m/products/${id}`);
  const showCost = userCanSeeCost(user);
  const [product, categories, brands] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.productCategory.findMany({
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      include: { parent: true },
    }),
    listProductBrandNames(),
  ]);
  if (!product) notFound();
  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={product.name} description={`${product.code} · 改资料、换图，保存即可`} />
      <ProductForm
        compact
        afterSaveHref="/m/products"
        showCost={showCost}
        enableScan
        brands={brands}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          parentId: c.parentId,
          parentName: c.parent?.name ?? null,
          defaultTrackSerial: c.defaultTrackSerial,
        }))}
        product={{
          id: product.id,
          code: product.code,
          name: product.name,
          brand: product.brand,
          spec: product.spec,
          unit: product.unit,
          barcode: product.barcode,
          categoryId: product.categoryId,
          isStocked: product.isStocked,
          trackSerial: product.trackSerial,
          commonSn: product.commonSn,
          canBeBuildPart: product.canBeBuildPart,
          salePrice: product.salePrice.toString(),
          lastCost: showCost ? product.lastCost.toString() : "",
          saleWarrantyMonths: product.saleWarrantyMonths,
          purchaseWarrantyMonths: product.purchaseWarrantyMonths,
          lowStock: product.lowStock.toString(),
          remark: product.remark,
          imageUrl: product.imageUrl,
          enabled: product.enabled,
        }}
      />
    </div>
  );
}
