export function assertDraft(status: string) {
  if (status !== "draft") throw new Error("仅草稿可修改或确认");
}

export function assertSubmitted(status: string) {
  if (status !== "submitted") throw new Error("仅已完成单据可作废或反审");
}

/** 反审：冲账后回到草稿，同一单号可再改再确认。 */
export const REOPEN_DRAFT = {
  status: "draft" as const,
  submittedAt: null,
  voidedAt: null,
};

export function assertSettlement(customer: { isWalkIn: boolean }, settlement: string) {
  if (customer.isWalkIn && settlement !== "cash") {
    throw new Error("散客不能月结/年结");
  }
}

export function addMonths(date: Date, months: number) {
  const d0 = new Date(date);
  d0.setMonth(d0.getMonth() + months);
  return d0;
}
