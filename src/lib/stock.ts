import type { Prisma } from "@/generated/prisma/client";
import { d } from "@/lib/money";
export { parseSerials } from "@/lib/serials";

export async function getDefaultWarehouse(tx: Prisma.TransactionClient) {
  const wh = await tx.warehouse.findFirst({ where: { isDefault: true } });
  if (!wh) throw new Error("未配置门店仓");
  return wh;
}

/** qtyDelta 正数为入库、负数为出库。只改流水与结存。 */
export async function applyStock(
  tx: Prisma.TransactionClient,
  input: {
    productId: string;
    qtyDelta: Prisma.Decimal | string | number;
    refType: string;
    refId: string;
    refNo: string;
    remark?: string;
  },
) {
  const product = await tx.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new Error("商品不存在");
  if (!product.isStocked) return;

  const delta = d(input.qtyDelta);
  if (delta.isZero()) return;

  const wh = await getDefaultWarehouse(tx);
  const existing = await tx.stockBalance.findUnique({
    where: { warehouseId_productId: { warehouseId: wh.id, productId: input.productId } },
  });
  const before = d(existing?.qty);
  const after = before.add(delta);
  if (after.lessThan(0)) {
    throw new Error(`${product.name} 库存不足（结存 ${before.toString()}，变动 ${delta.toString()}）`);
  }

  if (existing) {
    await tx.stockBalance.update({ where: { id: existing.id }, data: { qty: after } });
  } else {
    await tx.stockBalance.create({
      data: { warehouseId: wh.id, productId: input.productId, qty: after },
    });
  }

  await tx.stockLedger.create({
    data: {
      warehouseId: wh.id,
      productId: input.productId,
      qty: delta,
      balanceAfter: after,
      refType: input.refType,
      refId: input.refId,
      refNo: input.refNo,
      remark: input.remark ?? "",
    },
  });
}

export async function assertSellableQty(
  tx: Prisma.TransactionClient,
  productId: string,
  need: Prisma.Decimal | string | number,
) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product?.isStocked) return;
  const wh = await getDefaultWarehouse(tx);
  const bal = await tx.stockBalance.findUnique({
    where: { warehouseId_productId: { warehouseId: wh.id, productId } },
  });
  if (d(bal?.qty).lessThan(d(need))) {
    throw new Error(`${product.name} 库存不足，请先待采购并入库`);
  }
}

/** 管唯一 SN。force 时扫码个数必须等于数量；否则没填按数量出库，填了的码不能多于数量。 */
export async function assertTrackedSerialCount(
  tx: Prisma.TransactionClient,
  productId: string,
  qty: Prisma.Decimal | string | number,
  sns: string[],
  verb: string,
  opts?: { force?: boolean },
) {
  const product = await tx.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("商品不存在");
  if (!product.trackSerial) return;
  const n = d(qty);
  const force = opts?.force !== false;
  if (sns.length === 0 && !force) return;
  if (!n.isInteger() || n.lessThanOrEqualTo(0)) {
    throw new Error(`${product.name} 管唯一 SN，${verb}数量必须是正整数`);
  }
  const need = n.toNumber();
  if (force) {
    if (sns.length !== need) {
      throw new Error(`${product.name} 管唯一 SN，${verb}数量 ${n.toString()}，已扫 ${sns.length} 个，必须一样多`);
    }
    return;
  }
  if (sns.length > need) {
    throw new Error(`${product.name} ${verb}已扫 ${sns.length} 个码，不能多于数量 ${n.toString()}`);
  }
}

export async function inboundSerials(
  tx: Prisma.TransactionClient,
  opts: {
    productId: string;
    sns: string[];
    supplierId?: string | null;
    purchaseWarranty?: Date | null;
    purchaseDocNo?: string;
  },
) {
  const product = await tx.product.findUnique({ where: { id: opts.productId } });
  const now = new Date();
  for (const sn of opts.sns) {
    const dup = await tx.serialNumber.findUnique({ where: { sn } });
    if (dup) throw new Error(`唯一 SN 已存在：${sn}`);
    await tx.serialNumber.create({
      data: {
        sn,
        commonSn: product?.commonSn ?? "",
        productId: opts.productId,
        supplierId: opts.supplierId ?? undefined,
        purchaseDocNo: opts.purchaseDocNo ?? "",
        inboundAt: now,
        status: "in_stock",
        purchaseWarranty: opts.purchaseWarranty,
      },
    });
  }
}

/** 作废入库：SN 仍须在库，删档后同一码才能再入库。已出库则不许作废入库单。 */
export async function voidInboundSerials(tx: Prisma.TransactionClient, sns: string[]) {
  for (const sn of sns) {
    const row = await tx.serialNumber.findUnique({ where: { sn } });
    if (!row) throw new Error(`唯一 SN 不存在：${sn}`);
    if (row.status !== "in_stock") {
      throw new Error(`串号 ${sn} 已不在库（${row.status}），不能作废这张入库单`);
    }
    await tx.customerAsset.deleteMany({ where: { sn } });
    await tx.serialNumber.delete({ where: { id: row.id } });
  }
}

export async function outboundSerials(
  tx: Prisma.TransactionClient,
  opts: {
    sns: string[];
    status?: string;
    customerId?: string;
    siteId?: string;
    saleDocNo?: string;
  },
) {
  const now = new Date();
  for (const sn of opts.sns) {
    const row = await tx.serialNumber.findUnique({ where: { sn } });
    if (!row) throw new Error(`唯一 SN 不存在：${sn}`);
    if (row.status !== "in_stock" && row.status !== "returned") {
      throw new Error(`串号 ${sn} 当前状态不可出库：${row.status}`);
    }
    await tx.serialNumber.update({
      where: { id: row.id },
      data: {
        status: opts.status ?? "sold",
        customerId: opts.customerId,
        siteId: opts.siteId,
        saleDocNo: opts.saleDocNo ?? "",
        soldAt: now,
      },
    });
  }
}

/** 客户退货/工单退料：从已售或已安装回到可再出库。 */
export async function returnSerials(tx: Prisma.TransactionClient, sns: string[]) {
  for (const sn of sns) {
    const row = await tx.serialNumber.findUnique({ where: { sn } });
    if (!row) throw new Error(`唯一 SN 不存在：${sn}`);
    if (row.status !== "sold" && row.status !== "installed") {
      throw new Error(`串号 ${sn} 当前不是已售/已安装，不能退回（${row.status}）`);
    }
    await tx.serialNumber.update({
      where: { id: row.id },
      data: {
        status: "returned",
        customerId: null,
        siteId: null,
        assetId: null,
        saleDocNo: "",
        soldAt: null,
      },
    });
  }
}

/** 作废出库类单据：SN 回到在库（销售/工单/组装/其它出库作废）。 */
export async function restockSerials(tx: Prisma.TransactionClient, sns: string[]) {
  for (const sn of sns) {
    const row = await tx.serialNumber.findUnique({ where: { sn } });
    if (!row) throw new Error(`唯一 SN 不存在：${sn}`);
    if (row.status === "in_stock") continue;
    if (!["sold", "installed", "returned", "scrapped"].includes(row.status)) {
      throw new Error(`串号 ${sn} 当前状态不能回库（${row.status}）`);
    }
    await tx.customerAsset.deleteMany({ where: { sn } });
    await tx.serialNumber.update({
      where: { id: row.id },
      data: {
        status: "in_stock",
        customerId: null,
        siteId: null,
        assetId: null,
        saleDocNo: "",
        soldAt: null,
      },
    });
  }
}

/** 作废退货/退料：SN 从 returned 回到已售或已安装。 */
export async function restoreOutboundSerials(
  tx: Prisma.TransactionClient,
  opts: {
    sns: string[];
    status: "sold" | "installed";
    customerId: string;
    siteId?: string | null;
    saleDocNo: string;
  },
) {
  const now = new Date();
  for (const sn of opts.sns) {
    const row = await tx.serialNumber.findUnique({ where: { sn } });
    if (!row) throw new Error(`唯一 SN 不存在：${sn}`);
    if (row.status !== "returned") {
      throw new Error(`串号 ${sn} 当前不是已退回，不能恢复出库（${row.status}）`);
    }
    await tx.serialNumber.update({
      where: { id: row.id },
      data: {
        status: opts.status,
        customerId: opts.customerId,
        siteId: opts.siteId ?? null,
        saleDocNo: opts.saleDocNo,
        soldAt: now,
      },
    });
  }
}

/** 退货/退料扫的码必须是原单出库的那几个。 */
export async function assertReturnSerialsMatch(
  tx: Prisma.TransactionClient,
  opts: { sns: string[]; productId: string; saleDocNo: string; expectStatus: string[] },
) {
  for (const sn of opts.sns) {
    const row = await tx.serialNumber.findUnique({ where: { sn } });
    if (!row) throw new Error(`唯一 SN 不存在：${sn}`);
    if (row.productId !== opts.productId) throw new Error(`串号 ${sn} 不是本行商品`);
    if (row.saleDocNo !== opts.saleDocNo) throw new Error(`串号 ${sn} 不是本单出库的码`);
    if (!opts.expectStatus.includes(row.status)) {
      throw new Error(`串号 ${sn} 当前状态不能退（${row.status}）`);
    }
  }
}
