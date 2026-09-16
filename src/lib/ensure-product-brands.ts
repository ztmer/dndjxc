import { prisma } from "@/lib/prisma";

/** 把商品/目录里已有的品牌名收进品牌表；已有的不改。 */
export async function ensureProductBrands() {
  const [fromShop, fromCatalog] = await Promise.all([
    prisma.product.findMany({ where: { NOT: { brand: "" } }, select: { brand: true }, distinct: ["brand"] }),
    prisma.catalogSku.findMany({ where: { NOT: { brand: "" } }, select: { brand: true }, distinct: ["brand"] }),
  ]);
  const names = [
    ...new Set(
      [...fromShop, ...fromCatalog]
        .map((r) => r.brand.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "zh"));
  for (let i = 0; i < names.length; i++) {
    const name = names[i]!;
    await prisma.productBrand.upsert({
      where: { name },
      create: { name, sort: i },
      update: {},
    });
  }
}

export async function rememberProductBrand(name: string) {
  const n = name.trim();
  if (!n) return;
  const exists = await prisma.productBrand.findUnique({ where: { name: n } });
  if (exists) return;
  const count = await prisma.productBrand.count();
  await prisma.productBrand.create({ data: { name: n, sort: count } });
}

export async function listProductBrandNames() {
  await ensureProductBrands();
  const rows = await prisma.productBrand.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }] });
  return rows.map((r) => r.name);
}
