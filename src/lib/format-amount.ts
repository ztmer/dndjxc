/** 仅做展示，不依赖 Prisma，可在客户端用。 */
export function formatAmount(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}
