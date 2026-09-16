import { PRODUCT_CATEGORY_TREE, categoryPathLabel } from "@/lib/product-category-tree";
import { prisma } from "@/lib/prisma";

/** 写入默认主类/子类；已存在的按 code 更新名称，不删店里自己加的。 */
export async function ensureProductCategories(db: Pick<typeof prisma, "productCategory"> = prisma) {
  for (let i = 0; i < PRODUCT_CATEGORY_TREE.length; i++) {
    const root = PRODUCT_CATEGORY_TREE[i];
    const parent = await db.productCategory.upsert({
      where: { code: root.code },
      create: { code: root.code, name: root.name, sort: i * 100 },
      update: { name: root.name, sort: i * 100 },
    });
    for (let j = 0; j < root.children.length; j++) {
      const child = root.children[j];
      await db.productCategory.upsert({
        where: { code: child.code },
        create: {
          code: child.code,
          name: child.name,
          parentId: parent.id,
          sort: i * 100 + j + 1,
          defaultTrackSerial: !!child.trackSerial,
        },
        update: { name: child.name, parentId: parent.id, sort: i * 100 + j + 1, defaultTrackSerial: !!child.trackSerial },
      });
    }
  }
}

export async function categoryDisplay(categoryId: string | null | undefined) {
  if (!categoryId) return "";
  const node = await prisma.productCategory.findUnique({
    where: { id: categoryId },
    include: { parent: true },
  });
  if (!node) return "";
  return categoryPathLabel(node.name, node.parent?.name);
}
