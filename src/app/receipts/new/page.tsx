import { ReceiptForm } from "@/components/forms/finance-forms";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { ReceiptCustomerPick } from "@/components/receipt-customer-pick";
import { EmptyHint } from "@/components/empty-hint";
import { describeArPicks } from "@/lib/ar-display";

export const dynamic = "force-dynamic";

export default async function NewReceiptPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { customerId } = await searchParams;
  const ar = await prisma.arEntry.findMany({ where: { voided: false }, include: { customer: true } });
  const openRows = ar.filter((a) => Number(a.totalAmt) - Number(a.receivedAmt) > 0);
  const openById = Object.fromEntries(openRows.map((a) => [a.id, Number(a.totalAmt) - Number(a.receivedAmt)]));
  const described = await describeArPicks(openRows, openById);
  const arById = Object.fromEntries(openRows.map((a) => [a.id, a]));
  const byCustomer = new Map<string, { id: string; name: string; entries: typeof described; openSum: number }>();
  for (const row of described) {
    const src = arById[row.id];
    const cur = byCustomer.get(src.customerId) ?? {
      id: src.customerId,
      name: src.customer.name,
      entries: [],
      openSum: 0,
    };
    cur.entries.push(row);
    cur.openSum += openById[row.id] ?? 0;
    byCustomer.set(src.customerId, cur);
  }
  const list = [...byCustomer.values()];
  const picked = customerId ? list.find((c) => c.id === customerId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="收款" description="核销未收金额。现金当场收；月结/年结建议先对账再收。" />
      {!picked ? (
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
            {list.length === 0 ? (
              <EmptyHint title="没有待收款" />
            ) : (
              <ReceiptCustomerPick
                list={list.map((c) => ({
                  id: c.id,
                  name: c.name,
                  extra: `${c.entries.length} 笔未收 · ${c.entries.map((e) => e.content.split("\n")[0] || e.title || e.sourceNo).slice(0, 2).join("；")}${c.entries.length > 2 ? "…" : ""}`,
                  amount: `¥${money(c.openSum)}`,
                }))}
                hrefOf={(id) => `/receipts/new?customerId=${id}`}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <ReceiptForm customerId={picked.id} customerName={picked.name} entries={picked.entries} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
