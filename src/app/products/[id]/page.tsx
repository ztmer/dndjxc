import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/forms/product-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { userCanSeeCost } from "@/lib/auth-shared";
import { listProductBrandNames } from "@/lib/ensure-product-brands";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSession(`/products/${id}`);
  const showCost = userCanSeeCost(user);
  const [product, categories, brands] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { catalogSku: { select: { id: true } } } }),
    prisma.productCategory.findMany({
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      include: { parent: true },
    }),
    listProductBrandNames(),
  ]);
  if (!product) notFound();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="本店商品"
        description={`${product.code} ${product.name}${product.catalogSku ? " · 对照产品目录（改这里不会改目录）" : " · 本店自建"}`}
      />
      {product.catalogSku ? (
        <p className="text-sm">
          <Link className="text-primary underline-offset-4 hover:underline" href={`/catalog/${product.catalogSku.id}`}>
            查看产品目录
          </Link>
        </p>
      ) : null}
      <Card>
        <CardContent className="pt-6">
          <ProductForm
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
            fromCatalog={!!product.catalogSku}
            showCost={showCost}
          />
        </CardContent>
      </Card>
    </div>
  );
}
