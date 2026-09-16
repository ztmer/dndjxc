import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/forms/product-form";
import { requireSession } from "@/lib/require-session";
import { userCanSeeCost } from "@/lib/auth-shared";
import { listProductBrandNames } from "@/lib/ensure-product-brands";

export const dynamic = "force-dynamic";

export default async function MobileNewProductPage() {
  const user = await requireSession("/m/products/new");
  const showCost = userCanSeeCost(user);
  const [categories, brands] = await Promise.all([
    prisma.productCategory.findMany({
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      include: { parent: true },
    }),
    listProductBrandNames(),
  ]);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">填名称、分类、售价，拍一张正面即可。条码可扫。保存后电脑「本店商品」立刻能看到。</p>
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
      />
    </div>
  );
}
