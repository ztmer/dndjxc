"use server";

import { assertLoggedIn } from "@/lib/require-session";

import { prisma } from "@/lib/prisma";
import { d } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { categoryDisplay } from "@/lib/ensure-product-categories";

export async function saveCatalogSku(input: {
  id?: string;
  code?: string;
  name: string;
  brand?: string;
  spec?: string;
  params?: string;
  unit?: string;
  categoryId?: string;
  imageUrl?: string;
  remark?: string;
  suggestedSale?: string;
  suggestedCost?: string;
  defaultWarrantyMonths?: string;
  defaultIsStocked: boolean;
  defaultTrackSerial: boolean;
  defaultCanBeBuildPart: boolean;
}) {
  await assertLoggedIn();

  try {
    if (!input.categoryId) throw new Error("请选择分类");
    const name = input.name.trim();
    if (!name) throw new Error("请填写名称");
    const category = await categoryDisplay(input.categoryId);
    let code = (input.code ?? "").trim();
    if (!code) {
      const n = await prisma.catalogSku.count();
      code = `CAT${String(n + 1).padStart(4, "0")}`;
    } else {
      const clash = await prisma.catalogSku.findFirst({
        where: { code, NOT: input.id ? { id: input.id } : undefined },
      });
      if (clash) throw new Error("目录编码已存在");
    }
    const data = {
      code,
      name,
      brand: (input.brand ?? "").trim(),
      spec: (input.spec ?? "").trim(),
      params: (input.params ?? "").trim(),
      unit: (input.unit ?? "件").trim() || "件",
      category,
      categoryId: input.categoryId,
      imageUrl: (input.imageUrl ?? "").trim(),
      remark: (input.remark ?? "").trim(),
      suggestedSale: d(input.suggestedSale ?? 0),
      suggestedCost: d(input.suggestedCost ?? 0),
      defaultWarrantyMonths: Number(input.defaultWarrantyMonths ?? 12) || 0,
      defaultIsStocked: input.defaultIsStocked,
      defaultTrackSerial: input.defaultIsStocked && input.defaultTrackSerial,
      defaultCanBeBuildPart: input.defaultIsStocked && input.defaultCanBeBuildPart,
    };
    const id = input.id
      ? (await prisma.catalogSku.update({ where: { id: input.id }, data })).id
      : (await prisma.catalogSku.create({ data })).id;
    revalidatePath("/catalog");
    revalidatePath(`/catalog/${id}`);
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

/** 把目录型号加入本店经营（有则直接返回） */
export async function addCatalogSkuToShop(catalogSkuId: string) {
  await assertLoggedIn();

  try {
    const sku = await prisma.catalogSku.findUnique({ where: { id: catalogSkuId }, include: { product: true } });
    if (!sku) throw new Error("目录里没有这一款");
    if (sku.product) return { ok: true as const, id: sku.product.id };
    const byCode = await prisma.product.findUnique({ where: { code: sku.code } });
    if (byCode) {
      await prisma.product.update({ where: { id: byCode.id }, data: { catalogSkuId: sku.id } });
      revalidatePath("/products");
      revalidatePath("/catalog");
      return { ok: true as const, id: byCode.id };
    }
    const created = await prisma.product.create({
      data: {
        code: sku.code,
        name: sku.name,
        brand: sku.brand,
        spec: sku.spec,
        unit: sku.unit,
        category: sku.category,
        categoryId: sku.categoryId,
        catalogSkuId: sku.id,
        isStocked: sku.defaultIsStocked,
        trackSerial: sku.defaultIsStocked && sku.defaultTrackSerial,
        canBeBuildPart: sku.defaultIsStocked && sku.defaultCanBeBuildPart,
        salePrice: sku.suggestedSale,
        lastCost: sku.suggestedCost,
        saleWarrantyMonths: sku.defaultWarrantyMonths,
        purchaseWarrantyMonths: sku.defaultWarrantyMonths,
        lowStock: sku.defaultIsStocked ? 1 : 0,
        remark: sku.remark,
        imageUrl: sku.imageUrl,
      },
    });
    revalidatePath("/products");
    revalidatePath("/catalog");
    revalidatePath(`/catalog/${sku.id}`);
    return { ok: true as const, id: created.id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "加入本店失败" };
  }
}

export type SlotPartHit = {
  code: string;
  name: string;
  brand: string;
  spec: string;
  params?: string;
  sale: number;
  imageUrl: string;
  catalogSkuId?: string;
  productId?: string;
};

/** 自助装机按配件位搜产品目录（库里没有时回退到内置目录）。 */
export async function searchSlotParts(slot: string, q?: string): Promise<SlotPartHit[]> {
  await assertLoggedIn();

  const { BUILD_SLOTS, SLOT_CAT_CODES, matchesSlotHint } = await import("@/lib/build-presets");
  if (!(BUILD_SLOTS as readonly string[]).includes(slot)) return [];
  const s = slot as (typeof BUILD_SLOTS)[number];
  const cats = SLOT_CAT_CODES[s];
  const kw = q?.trim();
  const nodes = await prisma.productCategory.findMany({ where: { code: { in: cats } } });
  const ids = nodes.map((n) => n.id);
  const db = ids.length
    ? await prisma.catalogSku.findMany({
        where: {
          categoryId: { in: ids },
          AND: kw
            ? {
                OR: [
                  { code: { contains: kw } },
                  { name: { contains: kw } },
                  { brand: { contains: kw } },
                  { spec: { contains: kw } },
                ],
              }
            : {},
        },
        include: { product: { select: { id: true } } },
        orderBy: [{ suggestedSale: "asc" }, { code: "asc" }],
        take: 80,
      })
    : [];
  const hits: SlotPartHit[] = [];
  const seen = new Set<string>();
  for (const r of db) {
    if (!matchesSlotHint(s, r.name, r.code)) continue;
    seen.add(r.code);
    hits.push({
      code: r.code,
      name: r.name,
      brand: r.brand,
      spec: r.spec,
      params: r.params,
      sale: Number(r.suggestedSale),
      imageUrl: r.imageUrl,
      catalogSkuId: r.id,
      productId: r.product?.id,
    });
  }
  const { PRODUCT_CATALOG } = await import("@/lib/product-catalog");
  for (const p of PRODUCT_CATALOG) {
    if (!cats.includes(p.cat) || seen.has(p.code)) continue;
    if (!matchesSlotHint(s, p.name, p.code)) continue;
    if (kw) {
      const blob = `${p.code} ${p.brand} ${p.name} ${p.spec}`.toLowerCase();
      if (!blob.includes(kw.toLowerCase())) continue;
    }
    seen.add(p.code);
    hits.push({
      code: p.code,
      name: p.name,
      brand: p.brand,
      spec: p.spec,
      params: p.params,
      sale: p.sale,
      imageUrl: "",
    });
    if (hits.length >= 80) break;
  }
  return hits.slice(0, 80);
}

export async function ensureShopProductByCode(code: string) {
  await assertLoggedIn();

  const existing = await prisma.catalogSku.findUnique({ where: { code } });
  if (existing) return addCatalogSkuToShop(existing.id);
  const { PRODUCT_CATALOG } = await import("@/lib/product-catalog");
  const p = PRODUCT_CATALOG.find((x) => x.code === code);
  if (!p) return { ok: false as const, error: "目录里还没有这一款" };
  const { ensureProductCategories, categoryDisplay } = await import("@/lib/ensure-product-categories");
  await ensureProductCategories();
  const cat = await prisma.productCategory.findUnique({ where: { code: p.cat }, include: { parent: true } });
  const category = cat ? await categoryDisplay(cat.id) : "";
  const sku = await prisma.catalogSku.create({
    data: {
      code: p.code,
      name: p.name,
      brand: p.brand,
      spec: p.spec,
      params: p.params ?? "",
      unit: p.unit,
      category,
      categoryId: cat?.id ?? null,
      imageUrl: "",
      remark: p.remark ?? "",
      suggestedSale: d(p.sale),
      suggestedCost: d(p.cost),
      defaultWarrantyMonths: p.warranty ?? (p.isStocked === false ? 0 : 12),
      defaultIsStocked: p.isStocked !== false,
      defaultTrackSerial: !!(p.isStocked !== false && p.trackSerial),
      defaultCanBeBuildPart: p.isStocked !== false && (p.canBeBuildPart ?? true),
    },
  });
  return addCatalogSkuToShop(sku.id);
}

/** 用 Excel 批量写入产品目录；编码已存在则更新。不接京东。 */
export async function importCatalogXlsx(formData: FormData) {
  await assertLoggedIn();

  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size < 32) throw new Error("请选择 .xlsx 文件");
    if (file.size > 8 * 1024 * 1024) throw new Error("文件不要超过 8MB");
    const { parseCatalogWorkbook } = await import("@/lib/catalog-xlsx");
    const { ensureProductCategories } = await import("@/lib/ensure-product-categories");
    await ensureProductCategories();
    const rows = await parseCatalogWorkbook(Buffer.from(await file.arrayBuffer()));
    if (!rows.length) throw new Error("没有数据行");
    if (rows.length > 2000) throw new Error("一次最多 2000 行");
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const line = i + 2;
      try {
        if (!r.name) throw new Error("缺名称");
        if (!r.catCode) throw new Error("缺分类编码");
        const cat = await prisma.productCategory.findUnique({ where: { code: r.catCode.trim() } });
        if (!cat || !cat.parentId) throw new Error(`分类编码 ${r.catCode} 不是子类（如 PC-CPU）`);
        const category = await categoryDisplay(cat.id);
        let code = r.code.trim();
        if (!code) code = `CAT${String((await prisma.catalogSku.count()) + 1).padStart(4, "0")}`;
        const data = {
          code,
          name: r.name,
          brand: r.brand,
          spec: r.spec,
          params: r.params,
          unit: r.unit || "件",
          category,
          categoryId: cat.id,
          imageUrl: r.imageUrl,
          remark: r.remark,
          suggestedSale: d(r.sale),
          suggestedCost: d(r.cost),
          defaultWarrantyMonths: Number(r.warranty) || 0,
          defaultIsStocked: r.isStocked,
          defaultTrackSerial: r.isStocked && r.trackSerial,
          defaultCanBeBuildPart: r.isStocked && r.canBeBuildPart,
        };
        const exist = await prisma.catalogSku.findUnique({ where: { code } });
        if (exist) {
          await prisma.catalogSku.update({ where: { id: exist.id }, data });
          updated += 1;
        } else {
          await prisma.catalogSku.create({ data });
          created += 1;
        }
      } catch (e) {
        errors.push(`第 ${line} 行：${e instanceof Error ? e.message : "失败"}`);
        if (errors.length >= 20) break;
      }
    }
    try {
      revalidatePath("/catalog");
    } catch {
      // 非页面请求时没有 cache store
    }
    if (!created && !updated) throw new Error(errors[0] ?? "没有导入成功的行");
    return {
      ok: true as const,
      created,
      updated,
      error: errors.length ? `另有 ${errors.length} 行失败：${errors.slice(0, 5).join("；")}` : undefined,
    };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "导入失败" };
  }
}

/** 把内置 CPU 目录的公开规格参数写回已入库条目（不改图）。 */
export async function syncCpuCatalogParams() {
  await assertLoggedIn();

  const { CPU_CATALOG } = await import("@/lib/product-catalog-cpu");
  let n = 0;
  for (const p of CPU_CATALOG) {
    const r = await prisma.catalogSku.updateMany({
      where: { code: p.code },
      data: { spec: p.spec, params: p.params ?? "", remark: p.remark ?? "" },
    });
    n += r.count;
  }
  try {
    revalidatePath("/catalog");
  } catch {
    /* 脚本环境 */
  }
  return n;
}

