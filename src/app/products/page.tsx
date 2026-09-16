import { Fragment } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/forms/product-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ensureProductCategories } from "@/lib/ensure-product-categories";
import { listProductBrandNames } from "@/lib/ensure-product-brands";
import { brandRank } from "@/lib/catalog-filters";
import { money } from "@/lib/money";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { userCanSeeCost } from "@/lib/auth-shared";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

function qs(base: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/products?${s}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string; brand?: string; page?: string }>;
}) {
  const { cat, q, brand, page: pageRaw } = await searchParams;
  const session = await getSessionUser();
  const showCost = session ? userCanSeeCost(session) : false;
  if ((await prisma.productCategory.count()) === 0) await ensureProductCategories();
  const categories = await prisma.productCategory.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    include: { parent: true },
  });
  let categoryIds: string[] | undefined;
  if (cat) {
    const node = categories.find((c) => c.id === cat);
    if (node) {
      const childIds = categories.filter((c) => c.parentId === node.id).map((c) => c.id);
      categoryIds = [node.id, ...childIds];
    }
  }
  const kw = q?.trim();
  const rowsRaw = await prisma.product.findMany({
    where: {
      AND: [
        categoryIds ? { categoryId: { in: categoryIds } } : {},
        brand ? { brand } : {},
        kw
          ? {
              OR: [
                { code: { contains: kw } },
                { name: { contains: kw } },
                { brand: { contains: kw } },
                { spec: { contains: kw } },
                { barcode: { contains: kw } },
                { commonSn: { contains: kw } },
              ],
            }
          : {},
      ],
    },
    include: { balances: true },
  });
  const rows = [...rowsRaw].sort((a, b) => {
    const br = brandRank(a.brand) - brandRank(b.brand);
    if (br !== 0) return br;
    const bn = a.brand.localeCompare(b.brand, "zh");
    if (bn !== 0) return bn;
    return Number(a.salePrice) - Number(b.salePrice);
  });
  const total = rows.length;
  const { page, skip, take } = listPageState(pageRaw, total);
  const pageRows = rows.slice(skip, skip + take);
  const brandRows = await prisma.product.findMany({
    where: categoryIds ? { categoryId: { in: categoryIds } } : {},
    select: { brand: true },
  });
  const brands = [...new Set(brandRows.map((r) => r.brand).filter(Boolean))].sort(
    (a, b) => brandRank(a) - brandRank(b) || a.localeCompare(b, "zh"),
  );
  const groups: { brand: string; items: typeof pageRows }[] = [];
  for (const p of pageRows) {
    const key = p.brand || "其它";
    const last = groups[groups.length - 1];
    if (last && last.brand === key) last.items.push(p);
    else groups.push({ brand: key, items: [p] });
  }
  const selected = cat ? categories.find((c) => c.id === cat) : undefined;
  const rootId = selected ? (selected.parentId ?? selected.id) : undefined;
  const childCats = rootId ? categories.filter((c) => c.parentId === rootId) : [];
  const roots = categories.filter((c) => !c.parentId);
  const catOpts = categories.map((c) => ({
    id: c.id,
    name: c.name,
    parentId: c.parentId,
    parentName: c.parent?.name ?? null,
    defaultTrackSerial: c.defaultTrackSerial,
  }));
  const brandNames = await listProductBrandNames();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="本店商品"
        description="添加、修改、删除只动本店卖什么、什么价。不会改产品目录里的图文规格。"
        actionHref="/catalog"
        actionLabel="产品目录"
      />
      <p className="text-sm">
        <Link className="text-primary underline-offset-4 hover:underline" href="/products/brands">
          商品品牌
        </Link>
        <span className="text-muted-foreground"> · 分类在左侧仓库菜单</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Link className={buttonVariants({ variant: cat ? "outline" : "default", size: "sm" })} href="/products">
          全部
        </Link>
        {roots.map((r) => (
          <Link
            key={r.id}
            className={buttonVariants({ variant: rootId === r.id ? "default" : "outline", size: "sm" })}
            href={qs({ cat: r.id })}
          >
            {r.name}
          </Link>
        ))}
      </div>
      {childCats.length ? (
        <div className="flex flex-wrap gap-2">
          {childCats.map((c) => (
            <Link
              key={c.id}
              className={buttonVariants({ variant: cat === c.id ? "default" : "outline", size: "sm" })}
              href={qs({ cat: c.id })}
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}
      {brands.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">品牌</span>
          <Link className={buttonVariants({ variant: brand ? "outline" : "default", size: "sm" })} href={qs({ cat, q })}>
            全部品牌
          </Link>
          {brands.map((b) => (
            <Link
              key={b}
              className={buttonVariants({ variant: brand === b ? "default" : "outline", size: "sm" })}
              href={qs({ cat, q, brand: b })}
            >
              {b}
            </Link>
          ))}
        </div>
      ) : null}
      <form className="flex max-w-lg gap-2" action="/products">
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        {brand ? <input type="hidden" name="brand" value={brand} /> : null}
        <Input name="q" defaultValue={q} placeholder="名称 / 型号 / 条码 / SN / 编码" />
        <Button type="submit" variant="outline">
          搜索
        </Button>
      </form>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">图</TableHead>
              <TableHead>编码</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>型号规格</TableHead>
              <TableHead>单位</TableHead>
              <TableHead className="text-right">单价</TableHead>
              <TableHead>SN</TableHead>
              <TableHead>分类</TableHead>
              <TableHead className="text-right">结存</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <Fragment key={g.brand}>
                {groups.length > 1 ? (
                  <TableRow key={`b-${g.brand}`} className="hover:bg-muted/50">
                    <TableCell colSpan={10} className="bg-muted/50 text-sm font-medium">
                      {g.brand}
                      <span className="ml-2 font-normal text-muted-foreground">{g.items.length} 款</span>
                    </TableCell>
                  </TableRow>
                ) : null}
                {g.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-12 w-12 rounded-md border bg-muted object-contain" />
                      ) : (
                        <div className="h-12 w-12 rounded-md border bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.code}</TableCell>
                    <TableCell>
                      <Link className="text-primary underline-offset-4 hover:underline" href={`/products/${p.id}`}>
                        {p.brand ? `${p.brand} ` : ""}
                        {p.name}
                      </Link>
                      {!p.enabled ? (
                        <Badge variant="secondary" className="ml-2">
                          停用
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.spec || "—"}</TableCell>
                    <TableCell>{p.unit}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.salePrice)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.trackSerial ? `唯一${p.commonSn ? ` / ${p.commonSn}` : ""}` : p.commonSn || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.category || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.isStocked ? (
                        <Link className="text-primary underline-offset-4 hover:underline" href={`/stock#p-${p.id}`}>
                          {p.balances.reduce((s, b) => s + Number(b.qty), 0)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/products/${p.id}`}>
                        修改
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
        <ListPager path="/products" page={page} total={total} query={{ cat, q, brand }} noun="款" />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>新建商品</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm categories={catOpts} brands={brandNames} showCost={showCost} />
        </CardContent>
      </Card>
    </div>
  );
}
