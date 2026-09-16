import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmStatement } from "@/components/confirm-statement";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PrintOpenButton } from "@/components/print-open-button";
import { expandStatementDetailRows } from "@/lib/ar-display";
import { statementPeriodLabel } from "@/lib/periods";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.statement.findUnique({
    where: { id },
    include: { customer: true, arEntries: { where: { voided: false }, orderBy: { bizDate: "asc" } } },
  });
  if (!doc) notFound();
  const details = await expandStatementDetailRows(doc.arEntries);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {doc.docNo} <StatusBadge status={doc.status} />
        </h1>
        <div className="flex gap-2">
          <PrintOpenButton href={`/print/statement/${doc.id}`}>打印对账单</PrintOpenButton>
          {doc.status === "draft" || doc.status === "confirmed" ? <ConfirmStatement id={doc.id} status={doc.status} /> : null}
        </div>
      </div>
      <p>
        {doc.customer.name}　{statementPeriodLabel(doc.periodType)}　{doc.periodStart.toLocaleDateString("zh-CN")} ~ {doc.periodEnd.toLocaleDateString("zh-CN")}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日期</TableHead>
            <TableHead>单号</TableHead>
            <TableHead>单据</TableHead>
            <TableHead>品名</TableHead>
            <TableHead>单位</TableHead>
            <TableHead className="text-right">数量</TableHead>
            <TableHead className="text-right">单价</TableHead>
            <TableHead className="text-right">金额</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {details.map((r, i) => (
            <TableRow key={`${r.sourceNo}-${i}`}>
              <TableCell>{r.date}</TableCell>
              <TableCell>
                {r.href && r.sourceNo ? (
                  <Link className="text-primary" href={r.href}>
                    {r.sourceNo}
                  </Link>
                ) : (
                  r.sourceNo
                )}
              </TableCell>
              <TableCell>{r.typeLabel}</TableCell>
              <TableCell className="whitespace-normal">
                <div className="font-medium">{r.name}</div>
                {r.serial && r.serial !== "—" ? <div className="text-xs text-muted-foreground">{r.serial}</div> : null}
              </TableCell>
              <TableCell>{r.unit || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{r.qty}</TableCell>
              <TableCell className="text-right tabular-nums">{r.price}</TableCell>
              <TableCell className="text-right tabular-nums">{r.amount}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={7} className="font-medium">
              数量合计 / 金额合计
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">{money(doc.totalAmt)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
