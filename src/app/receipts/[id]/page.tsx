import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DocButtons } from "@/components/doc-buttons";
import { submitReceipt, voidReceipt, unsubmitReceipt } from "@/actions/finance";
import { PAY_METHOD, label } from "@/lib/labels";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ReceiptForm } from "@/components/forms/finance-forms";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { describeArPicks } from "@/lib/ar-display";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.receipt.findUnique({ where: { id }, include: { customer: true, lines: true } });
  if (!doc) notFound();
  const arIds = doc.lines.map((l) => l.arEntryId);
  const ars = await prisma.arEntry.findMany({ where: { id: { in: arIds } } });
  const amap = Object.fromEntries(ars.map((a) => [a.id, a]));

  if (doc.status === "draft") {
    const openAr = await prisma.arEntry.findMany({ where: { customerId: doc.customerId, voided: false } });
    const byId = new Map(openAr.map((a) => [a.id, a]));
    for (const a of ars) byId.set(a.id, a);
    const candidates = [...byId.values()];
    const openById: Record<string, number> = {};
    const keep = candidates.filter((a) => {
      const open = Number(a.totalAmt) - Number(a.receivedAmt);
      const draftAmt = Number(doc.lines.find((l) => l.arEntryId === a.id)?.amount ?? 0);
      if (open <= 0 && draftAmt <= 0) return false;
      openById[a.id] = open;
      return true;
    });
    const entries = await describeArPicks(keep, openById);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader title={`${doc.docNo} 草稿`} description={doc.customer.name} />
          <DocButtons id={doc.id} status={doc.status} onSubmit={submitReceipt} onUnsubmit={unsubmitReceipt} onVoid={voidReceipt} printHref={`/print/receipt/${doc.id}`} submitLabel="收款" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <ReceiptForm
              customerId={doc.customerId}
              customerName={doc.customer.name}
              entries={entries}
              docId={doc.id}
              defaultMethod={doc.method}
              defaultRemark={doc.remark}
              defaultAmounts={Object.fromEntries(doc.lines.map((l) => [l.arEntryId, money(l.amount)]))}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const views = await describeArPicks(
    ars,
    Object.fromEntries(ars.map((a) => [a.id, Number(a.totalAmt) - Number(a.receivedAmt)])),
  );
  const viewById = Object.fromEntries(views.map((v) => [v.id, v]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
            {doc.docNo}
            <StatusBadge status={doc.status} />
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate(doc.bizDate)}</p>
        </div>
        <DocButtons id={doc.id} status={doc.status} onSubmit={submitReceipt} onUnsubmit={unsubmitReceipt} onVoid={voidReceipt} printHref={`/print/receipt/${doc.id}`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">客户</CardTitle>
          </CardHeader>
          <CardContent>
            <Link className="font-medium text-primary" href={`/customers/${doc.customerId}`}>
              {doc.customer.name}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">方式</CardTitle>
          </CardHeader>
          <CardContent>{label(PAY_METHOD, doc.method)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">金额</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">¥{money(doc.amount)}</CardContent>
        </Card>
      </div>
      {doc.remark ? <p className="text-sm text-muted-foreground">备注：{doc.remark}</p> : null}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>类型</TableHead>
              <TableHead>核销来源</TableHead>
              <TableHead className="text-right">本次金额</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doc.lines.map((l) => {
              const v = viewById[l.arEntryId];
              const ar = amap[l.arEntryId];
              return (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap">{v?.typeLabel ?? ""}</TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="flex min-w-0 flex-col gap-1">
                      {v?.href ? (
                        <Link className="text-sm text-primary" href={v.href}>
                          {v.sourceNo}
                        </Link>
                      ) : (
                        <span className="text-sm">{ar?.sourceNo ?? l.arEntryId}</span>
                      )}
                      <span className="whitespace-pre-wrap break-words font-medium">
                        {v?.content || v?.title || "（原单无摘要）"}
                      </span>
                      {v?.detail ? <span className="text-xs text-muted-foreground">{v.detail}</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(l.amount)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>合计</TableCell>
              <TableCell className="text-right tabular-nums">{money(doc.amount)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Card>
    </div>
  );
}
