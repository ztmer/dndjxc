import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryForm, DeleteCategoryButton } from "@/components/forms/category-form";
import { Badge } from "@/components/ui/badge";
import { ensureProductCategories } from "@/lib/ensure-product-categories";

export const dynamic = "force-dynamic";

export default async function ProductCategoriesPage() {
  await ensureProductCategories();
  const rows = await prisma.productCategory.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true, children: true } } },
  });
  const roots = rows.filter((r) => !r.parentId);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="商品分类"
        description="主板、CPU、内存、硬盘、显卡、显示器等默认管唯一 SN：商品资料仍只建一条，进出货按台扫码。"
      />
      <Card>
        <CardHeader>
          <CardTitle>新增分类</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm parents={roots.map((r) => ({ id: r.id, name: r.name }))} />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {roots.map((root) => {
          const children = rows.filter((r) => r.parentId === root.id);
          return (
            <Card key={root.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {root.name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {root._count.products} 件商品
                  </span>
                </CardTitle>
                <DeleteCategoryButton id={root.id} />
              </CardHeader>
              <CardContent className="grid gap-1 text-sm">
                {children.length === 0 ? (
                  <p className="text-muted-foreground">还没有子类</p>
                ) : (
                  children.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 border-b py-1 last:border-0">
                      <span>
                        {c.name}
                        {c.defaultTrackSerial ? (
                          <Badge variant="secondary" className="ml-2">
                            唯一 SN
                          </Badge>
                        ) : null}
                        <span className="ml-2 text-muted-foreground">{c._count.products} 件</span>
                      </span>
                      <DeleteCategoryButton id={c.id} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
