import { prisma } from "@/lib/prisma";
import { CatalogForm } from "@/components/forms/catalog-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddToShopButton } from "@/components/add-to-shop-button";
import { money } from "@/lib/money";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { userCanSeeCost } from "@/lib/auth-shared";

export const dynamic = "force-dynamic";

export default async function CatalogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [sku, categories] = await Promise.all([
    prisma.catalogSku.findUnique({ where: { id }, include: { product: { select: { id: true } } } }),
    prisma.productCategory.findMany({
      orderBy: [{ sort: "asc" }, { name: "asc" }],
      include: { parent: true },
    }),
  ]);
  if (!sku) notFound();
  const session = await getSessionUser();
  const showCost = session ? userCanSeeCost(session) : false;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title={sku.brand ? `${sku.brand} ${sku.name}` : sku.name} description={`${sku.code} · ${sku.category || "未分类"}`} />
        <AddToShopButton catalogSkuId={sku.id} productId={sku.product?.id} />
        {sku.code.startsWith("KIT-") ? (
          <Link className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground" href={`/builds/new?kit=${encodeURIComponent(sku.code)}`}>
            用此套餐开配置
          </Link>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>图文与参数</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row">
          {sku.imageUrl ? (
            <img src={sku.imageUrl} alt="" className="h-40 w-40 rounded-lg border bg-muted object-contain" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
              无图
            </div>
          )}
          <dl className="grid flex-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">型号规格</dt>
              <dd>{sku.spec || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">单位</dt>
              <dd>{sku.unit}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">参考零售价</dt>
              <dd className="tabular-nums">{money(sku.suggestedSale)}</dd>
            </div>
            {showCost ? (
            <div>
              <dt className="text-muted-foreground">参考进价</dt>
              <dd className="tabular-nums">{money(sku.suggestedCost)}</dd>
            </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">参考保修</dt>
              <dd>{sku.defaultWarrantyMonths} 个月</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">详细参数</dt>
              <dd className="whitespace-pre-wrap">{sku.params || "—"}</dd>
            </div>
            {sku.remark ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">备注</dt>
                <dd className="whitespace-pre-wrap">{sku.remark}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>
      {sku.product ? (
        <p className="text-sm text-muted-foreground">
          本店已经营，改售价和库存请到{" "}
          <Link className="text-primary underline-offset-4 hover:underline" href={`/products/${sku.product.id}`}>
            本店商品
          </Link>
          。
        </p>
      ) : null}
      {showCost ? (
      <Card>
        <CardHeader>
          <CardTitle>改目录资料</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogForm
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              parentId: c.parentId,
              parentName: c.parent?.name ?? null,
              defaultTrackSerial: c.defaultTrackSerial,
            }))}
            sku={{
              id: sku.id,
              code: sku.code,
              name: sku.name,
              brand: sku.brand,
              spec: sku.spec,
              params: sku.params,
              unit: sku.unit,
              categoryId: sku.categoryId,
              imageUrl: sku.imageUrl,
              remark: sku.remark,
              suggestedSale: sku.suggestedSale.toString(),
              suggestedCost: sku.suggestedCost.toString(),
              defaultWarrantyMonths: sku.defaultWarrantyMonths,
              defaultIsStocked: sku.defaultIsStocked,
              defaultTrackSerial: sku.defaultTrackSerial,
              defaultCanBeBuildPart: sku.defaultCanBeBuildPart,
            }}
          />
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}
