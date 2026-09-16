import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandForm, DeleteBrandButton } from "@/components/forms/brand-form";
import { ensureProductBrands } from "@/lib/ensure-product-brands";

export const dynamic = "force-dynamic";

export default async function ProductBrandsPage() {
  await ensureProductBrands();
  const rows = await prisma.productBrand.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
  });
  const used = await prisma.product.groupBy({
    by: ["brand"],
    _count: { _all: true },
  });
  const usedMap = Object.fromEntries(used.map((r) => [r.brand, r._count._all]));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="商品品牌" description="开单和商品资料从这里选品牌。清空业务重开时品牌会保留。" />
      <Card>
        <CardHeader>
          <CardTitle>新增品牌</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>已有品牌</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          {rows.length === 0 ? (
            <p className="text-muted-foreground">还没有品牌。可在此新增，或先在商品资料里填品牌名会自动收进来。</p>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 border-b py-1 last:border-0">
                <span>
                  {r.name}
                  <span className="ml-2 text-muted-foreground">{usedMap[r.name] ?? 0} 件商品</span>
                </span>
                <DeleteBrandButton id={r.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
