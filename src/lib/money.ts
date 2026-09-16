import { Prisma } from "@/generated/prisma/client";

/** Prisma Decimal、数字，以及只有 toString 的金额字段（webpack 类型检查更严） */
export type AmountLike = Prisma.Decimal | string | number | { toString(): string } | null | undefined;

export function d(v: AmountLike): Prisma.Decimal {
  if (v == null || v === "") return new Prisma.Decimal(0);
  if (v instanceof Prisma.Decimal) return v;
  return new Prisma.Decimal(String(v));
}

export function money(v: AmountLike): string {
  return d(v).toFixed(2);
}

export function qty(v: AmountLike): string {
  return d(v).toFixed(4).replace(/\.?0+$/, "") || "0";
}
