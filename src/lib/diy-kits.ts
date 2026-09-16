import { prisma } from "@/lib/prisma";
import { DIY_KITS, type BuildPresetPart } from "@/lib/build-presets";
import type { ShopDiyKit } from "@/lib/diy-kit-types";

export function parseKitParts(raw: string): BuildPresetPart[] {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.flatMap((x) => {
      const row = x as { slot?: string; code?: string; qty?: string };
      if (!row.slot || !row.code) return [];
      const part: BuildPresetPart = { slot: row.slot as BuildPresetPart["slot"], code: String(row.code) };
      if (row.qty) part.qty = row.qty;
      return [part];
    });
  } catch {
    return [];
  }
}

function fromRow(row: {
  id: string;
  code: string;
  name: string;
  scene: string;
  hint: string;
  laborFee: string;
  sale: { toString(): string } | number;
  cost: { toString(): string } | number;
  cpu: string;
  gpu: string;
  mb: string;
  ram: string;
  remark: string;
  partsJson: string;
}): ShopDiyKit {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    scene: row.scene,
    hint: row.hint,
    laborFee: row.laborFee,
    sale: Number(row.sale),
    cost: Number(row.cost),
    cpu: row.cpu,
    gpu: row.gpu,
    mb: row.mb,
    ram: row.ram,
    remark: row.remark,
    parts: parseKitParts(row.partsJson),
  };
}

/** 库里没有套餐时，写入内置京东参考套餐，之后店里自己改。 */
export async function ensureDiyKits() {
  const n = await prisma.diyKit.count();
  if (n > 0) return;
  await prisma.diyKit.createMany({
    data: DIY_KITS.map((k, i) => ({
      id: k.id,
      code: k.code,
      name: k.name,
      scene: k.scene,
      hint: k.hint,
      laborFee: k.laborFee,
      sale: k.sale,
      cost: k.cost,
      cpu: k.cpu,
      gpu: k.gpu,
      mb: k.mb,
      ram: k.ram,
      remark: k.remark,
      partsJson: JSON.stringify(k.parts),
      sort: i,
      enabled: true,
    })),
  });
}

export async function listDiyKits(includeDisabled = false): Promise<ShopDiyKit[]> {
  await ensureDiyKits();
  const rows = await prisma.diyKit.findMany({
    where: includeDisabled ? undefined : { enabled: true },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
  });
  return rows.map(fromRow);
}

export function findKitIn(kits: ShopDiyKit[], key: string) {
  return kits.find((k) => k.id === key || k.code === key);
}
