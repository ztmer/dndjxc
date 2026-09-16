import { Fragment, type ComponentProps } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { CatalogForm } from "@/components/forms/catalog-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ensureProductCategories } from "@/lib/ensure-product-categories";
import { money } from "@/lib/money";
import { brandRank } from "@/lib/catalog-filters";
import { Pager } from "@/components/pager";
import { DiyKitBoard } from "@/components/diy-kit-board";
import { DIY_PRICE_BANDS, DIY_SCENES, diyPriceFilter } from "@/lib/build-presets";
import { listDiyKits } from "@/lib/diy-kits";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogImport } from "@/components/catalog-import";
import { syncCpuCatalogParams } from "@/actions/catalog";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const KIT_PAGE_SIZE = 20;

function qs(base: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v === undefined || v === "") continue;
    if (k === "page" && Number(v) <= 1) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `/catalog?${s}` : "/catalog";
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string; brand?: string; page?: string; scene?: string; band?: string }>;
}) {
  const { cat, q, brand, page: pageRaw, scene, band } = await searchParams;
  const pageNum = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
  await ensureProductCategories();
  const categories = await prisma.productCategory.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    include: { parent: true },
  });
  const cpuCat = categories.find((c) => c.code === "PC-CPU");
  if (cpuCat) {
    const stale = await prisma.catalogSku.count({
      where: { categoryId: cpuCat.id, NOT: { params: { contains: "插槽：" } } },
    });
    if (stale > 0) await syncCpuCatalogParams();
  }
  const selected = cat ? categories.find((c) => c.id === cat) : undefined;
  const kitCat = categories.find((c) => c.code === "PC-KIT");
  const isPcRoot = selected?.code === "PC" && !selected.parentId;
  const isKitView = Boolean(kitCat && (selected?.code === "PC-KIT" || isPcRoot));
  let categoryIds: string[] | undefined;
  if (isKitView && kitCat) {
    categoryIds = [kitCat.id];
  } else if (cat && selected) {
    const childIds = categories.filter((c) => c.parentId === selected.id).map((c) => c.id);
    categoryIds = [selected.id, ...childIds];
  }
  const kw = q?.trim();
  const price = isKitView ? diyPriceFilter(band) : undefined;
  const where = {
    AND: [
      categoryIds ? { categoryId: { in: categoryIds } } : {},
      !isKitView && brand ? { brand } : {},
      isKitView && scene ? { params: { contains: `场景：${scene}` } } : {},
      price
        ? {
            suggestedSale: {
              ...(price.gte != null ? { gte: price.gte } : {}),
              ...(price.lt != null ? { lt: price.lt } : {}),
            },
          }
        : {},
      kw
        ? {
            OR: [
              { code: { contains: kw } },
              { name: { contains: kw } },
              { brand: { contains: kw } },
              { spec: { contains: kw } },
              { params: { contains: kw } },
            ],
          }
        : {},
    ],
  };
  const pageSize = isKitView ? KIT_PAGE_SIZE : PAGE_SIZE;
  const [total, brandGroups] = await Promise.all([
    prisma.catalogSku.count({ where }),
    isKitView
      ? Promise.resolve([] as { brand: string }[])
      : prisma.catalogSku.groupBy({
          by: ["brand"],
          where: categoryIds ? { categoryId: { in: categoryIds } } : {},
        }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageNum, pageCount);
  const rows = await prisma.catalogSku.findMany({
    where,
    include: { product: { select: { id: true } } },
    orderBy: isKitView
      ? [{ suggestedSale: "asc" }, { code: "asc" }]
      : [{ brand: "asc" }, { suggestedSale: "asc" }, { code: "asc" }],
    skip: total === 0 && isKitView ? 0 : (page - 1) * pageSize,
    take: pageSize,
  });
  let kitRows: ComponentProps<typeof DiyKitBoard>["rows"] = rows;
  let kitTotal = total;
  let kitPageCount = pageCount;
  let kitPage = page;
  if (isKitView && total === 0) {
    let kits = await listDiyKits();
    if (scene) kits = kits.filter((k) => k.scene === scene);
    if (price) {
      kits = kits.filter((k) => {
        if (price.gte != null && k.sale < price.gte) return false;
        if (price.lt != null && k.sale >= price.lt) return false;
        return true;
      });
    }
    if (kw) {
      const n = kw.toLowerCase();
      kits = kits.filter((k) => [k.name, k.code, k.cpu, k.gpu, k.mb, k.ram, k.remark].join(" ").toLowerCase().includes(n));
    }
    kitTotal = kits.length;
    kitPageCount = Math.max(1, Math.ceil(kitTotal / pageSize));
    kitPage = Math.min(pageNum, kitPageCount);
    kitRows = kits.slice((kitPage - 1) * pageSize, kitPage * pageSize).map((k) => ({
      id: k.code,
      code: k.code,
      name: k.name,
      spec: `${k.scene} · ${k.cpu} / ${k.gpu}`,
      params: [`场景：${k.scene}`, `CPU：${k.cpu}`, `显卡：${k.gpu}`, `主板：${k.mb}`, `内存：${k.ram}`].join("\n"),
      imageUrl: "",
      suggestedSale: k.sale,
    }));
  }
  const brands = brandGroups
    .map((r) => r.brand)
    .filter(Boolean)
    .sort((a, b) => brandRank(a) - brandRank(b) || a.localeCompare(b, "zh"));
  const groups: { brand: string; items: typeof rows }[] = [];
  for (const p of rows) {
    const key = p.brand || "其它";
    const last = groups[groups.length - 1];
    if (last && last.brand === key) last.items.push(p);
    else groups.push({ brand: key, items: [p] });
  }
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
  const filter = { cat, q, brand: isKitView ? undefined : brand, scene: isKitView ? scene : undefined, band: isKitView ? band : undefined };
  const kitCatActive = isPcRoot || selected?.code === "PC-KIT";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="产品目录"
        description={
          isKitView
            ? "组装电脑按京东装机宝典展示整机套餐。点「开配置」写入配件清单；主板/CPU 等子类仍是散件。"
            : "2007 年起台式机散件、品牌机、网络、监控、打印都在这里。图文规格进目录；可用 Excel 导入自家资料。本店卖不卖去「本店商品」。每页 50 款。"
        }
        actionHref={isKitView ? "/builds/new" : "/products"}
        actionLabel={isKitView ? "自助装机" : "本店商品"}
      />
      <div className="flex flex-wrap gap-2">
        <Link className={buttonVariants({ variant: cat ? "outline" : "default", size: "sm" })} href="/catalog">
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
              className={buttonVariants({
                variant: c.code === "PC-KIT" ? (kitCatActive ? "default" : "outline") : cat === c.id ? "default" : "outline",
                size: "sm",
              })}
              href={qs({ cat: c.id })}
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}
      {isKitView ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">应用场景</span>
            <Link className={buttonVariants({ variant: scene ? "outline" : "default", size: "sm" })} href={qs({ cat, q, band })}>
              全部
            </Link>
            {DIY_SCENES.map((s) => (
              <Link
                key={s}
                className={buttonVariants({ variant: scene === s ? "default" : "outline", size: "sm" })}
                href={qs({ cat, q, scene: s, band })}
              >
                {s}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">价格区间</span>
            <Link className={buttonVariants({ variant: band ? "outline" : "default", size: "sm" })} href={qs({ cat, q, scene })}>
              全部
            </Link>
            {DIY_PRICE_BANDS.map((b) => (
              <Link
                key={b}
                className={buttonVariants({ variant: band === b ? "default" : "outline", size: "sm" })}
                href={qs({ cat, q, scene, band: b })}
              >
                {b}
              </Link>
            ))}
          </div>
        </>
      ) : brands.length > 1 ? (
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
      <form className="flex max-w-lg gap-2" action="/catalog">
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        {!isKitView && brand ? <input type="hidden" name="brand" value={brand} /> : null}
        {isKitView && scene ? <input type="hidden" name="scene" value={scene} /> : null}
        {isKitView && band ? <input type="hidden" name="band" value={band} /> : null}
        <Input name="q" defaultValue={q} placeholder="名称 / 型号 / 编码 / 参数" />
        <Button type="submit" variant="outline">
          搜索
        </Button>
      </form>
      {!isKitView ? <CatalogImport /> : null}
      <Card className="py-0">
        {isKitView ? (
          <DiyKitBoard rows={kitRows} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">图</TableHead>
                <TableHead>编码</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>型号规格</TableHead>
                <TableHead>单位</TableHead>
                <TableHead className="text-right">参考价</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>本店</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <Fragment key={g.brand}>
                  {groups.length > 1 ? (
                    <TableRow key={`b-${g.brand}`} className="hover:bg-muted/50">
                      <TableCell colSpan={8} className="bg-muted/50 text-sm font-medium">
                        {g.brand}
                        <span className="ml-2 font-normal text-muted-foreground">本页 {g.items.length} 款</span>
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
                        <Link className="text-primary underline-offset-4 hover:underline" href={`/catalog/${p.id}`}>
                          {p.brand ? `${p.brand} ` : ""}
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.spec || "—"}</TableCell>
                      <TableCell>{p.unit}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(p.suggestedSale)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.category || "—"}</TableCell>
                      <TableCell>
                        {p.product ? <Badge>已经营</Badge> : <Badge variant="secondary">仅目录</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
        {(isKitView ? kitTotal : total) > pageSize ? (
          <Pager
            page={isKitView ? kitPage : page}
            pageCount={isKitView ? kitPageCount : pageCount}
            total={isKitView ? kitTotal : total}
            pageSize={pageSize}
            noun="款"
            hrefForPage={(p) => qs({ ...filter, page: p })}
          />
        ) : null}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>新建目录型号</CardTitle>
        </CardHeader>
        <CardContent>
          <CatalogForm categories={catOpts} />
        </CardContent>
      </Card>
    </div>
  );
}
