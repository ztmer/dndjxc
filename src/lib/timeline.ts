import type { Prisma } from "@/generated/prisma/client";
import { d } from "@/lib/money";

export async function addTimeline(
  tx: Prisma.TransactionClient,
  input: {
    customerId: string;
    eventType: string;
    refType: string;
    refId: string;
    refNo: string;
    summary: string;
    amount?: Prisma.Decimal | string | number;
  },
) {
  await tx.timelineEvent.create({
    data: {
      customerId: input.customerId,
      eventType: input.eventType,
      refType: input.refType,
      refId: input.refId,
      refNo: input.refNo,
      summary: input.summary,
      amount: d(input.amount ?? 0),
    },
  });
}
