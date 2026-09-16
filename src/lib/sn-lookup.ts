import { prisma } from "@/lib/prisma";
import { listPageState } from "@/lib/list-page";

const serialInclude = {
  product: true,
  supplier: true,
  customer: true,
} as const;

type SerialRow = Awaited<
  ReturnType<typeof prisma.serialNumber.findFirst<{ include: typeof serialInclude }>>
>;

/** 先按唯一 SN；再按商品通用 SN（同款多件，无法对应单一买家）。 */
export async function lookupSn(
  raw: string,
  pageRaw?: string,
): Promise<{
  q: string;
  unique: SerialRow;
  commonProduct: Awaited<ReturnType<typeof prisma.product.findFirst>>;
  units: NonNullable<SerialRow>[];
  unitsTotal: number;
  unitsPage: number;
}> {
  const q = raw.trim();
  if (!q) {
    return { q, unique: null, commonProduct: null, units: [], unitsTotal: 0, unitsPage: 1 };
  }

  const unique = await prisma.serialNumber.findUnique({
    where: { sn: q },
    include: serialInclude,
  });
  if (unique) {
    return { q, unique, commonProduct: null, units: [], unitsTotal: 0, unitsPage: 1 };
  }

  const commonProduct = await prisma.product.findFirst({
    where: { commonSn: q },
  });
  const where = commonProduct
    ? { OR: [{ commonSn: q }, { productId: commonProduct.id }] }
    : { commonSn: q };
  const unitsTotal = await prisma.serialNumber.count({ where });
  const { page: unitsPage, skip, take } = listPageState(pageRaw, unitsTotal);
  const units = await prisma.serialNumber.findMany({
    where,
    include: serialInclude,
    orderBy: { sn: "asc" },
    skip,
    take,
  });
  return { q, unique: null, commonProduct, units, unitsTotal, unitsPage };
}
