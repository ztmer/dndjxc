import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { qty } from "@/lib/money";

export const productOpts = cache(async () => {
  const [rows, balances] = await Promise.all([
    prisma.product.findMany({
      where: { enabled: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        brand: true,
        spec: true,
        unit: true,
        salePrice: true,
        lastCost: true,
        isStocked: true,
        trackSerial: true,
        category: true,
        catalogSku: { select: { params: true } },
        categoryNode: { select: { code: true } },
      },
    }),
    prisma.stockBalance.findMany({ select: { productId: true, qty: true } }),
  ]);
  const stockMap = new Map<string, number>();
  for (const b of balances) {
    stockMap.set(b.productId, (stockMap.get(b.productId) ?? 0) + Number(b.qty));
  }
  return rows.map((p) => ({
    id: p.id,
    code: p.code,
    name: [p.code, p.brand, p.name, p.spec].filter(Boolean).join(" ") + ` /${p.unit}`,
    itemName: p.name,
    salePrice: p.salePrice.toString(),
    lastCost: p.lastCost.toString(),
    isStocked: p.isStocked,
    trackSerial: p.trackSerial,
    unit: p.unit,
    category: p.category,
    categoryCode: p.categoryNode?.code ?? "",
    spec: p.spec,
    brand: p.brand,
    params: p.catalogSku?.params ?? "",
    stockQty: p.isStocked ? qty(stockMap.get(p.id) ?? 0) : undefined,
  }));
});

export const customerOpts = cache(async () => {
  const rows = await prisma.customer.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      phone: true,
      settlement: true,
      isWalkIn: true,
      priceMemory: true,
      needInvoice: true,
    },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    settlement: c.settlement,
    isWalkIn: c.isWalkIn,
    priceMemory: c.priceMemory,
    needInvoice: c.needInvoice,
  }));
});
