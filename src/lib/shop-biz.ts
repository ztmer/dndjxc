import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function getShopBiz() {
  return prisma.shopBizSetting.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function outboundSnForced(tx?: Prisma.TransactionClient) {
  const db = tx ?? prisma;
  const row = await db.shopBizSetting.findUnique({ where: { id: "default" } });
  return !!row?.forceOutboundSn;
}
