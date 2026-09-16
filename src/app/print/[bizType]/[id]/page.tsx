import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolvePrintFormat, salesPrintData, shopName, contractPrintData, statementPrintData, receiptPrintData, warrantyLabelPrintDatas, buildConfigPrintData } from "@/lib/print";
import { money, qty } from "@/lib/money";
import { formatSerialsDisplay } from "@/lib/serials";
import { PrintToolbar } from "@/components/print-toolbar";
import { paperHint, paperPreviewMaxWidth } from "@/lib/report-formats";
import { parseLayout, renderLayoutHtml } from "@/lib/report-layout";

export const dynamic = "force-dynamic";

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ bizType: string; id: string }>;
  searchParams: Promise<{ formatId?: string }>;
}) {
  const { bizType, id } = await params;
  const { formatId } = await searchParams;
  const tpl = await resolvePrintFormat(bizType, formatId);
  if (!tpl) notFound();

  const shop = await shopName();
  let data: Record<string, string> | Record<string, string>[] = { shop };
  let labelError = "";
  try {
    if (bizType === "salesOrder" || bizType === "deliveryNote") data = await salesPrintData(id);
    else if (bizType === "contract") data = await contractPrintData(id);
    else if (bizType === "statement") data = await statementPrintData(id);
    else if (bizType === "warrantyLabel") data = await warrantyLabelPrintDatas(id);
    else if (bizType === "buildConfig" || bizType === "installSheet") {
      data = await buildConfigPrintData(id, bizType);
    } else if (bizType === "workOrder") {
    const doc = await prisma.workOrder.findUnique({ where: { id }, include: { customer: true, lines: true } });
    if (!doc) notFound();
    const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
    const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
    data = {
      shop,
      docNo: doc.docNo,
      customer: doc.customer.name,
      phone: doc.customer.phone || "—",
      process: doc.processNote,
      watermark: doc.status === "draft" ? "草稿" : doc.status === "voided" ? "作废" : "",
      lines: doc.lines
        .map(
          (l) =>
            `<tr><td>${pmap[l.productId]?.name}</td><td>${pmap[l.productId]?.unit || ""}</td><td>${qty(l.qty)}</td><td>${money(l.amount)}</td><td>${formatSerialsDisplay(l.serialsJson)}</td></tr>`,
        )
        .join(""),
      rowsJson: JSON.stringify(
        doc.lines.map((l) => {
          const p = pmap[l.productId];
          return {
            name: p?.name ?? "",
            brand: p?.brand ?? "",
            spec: p?.spec ?? "",
            code: p?.code ?? "",
            unit: p?.unit ?? "",
            qty: qty(l.qty),
            price: money(l.price),
            amount: money(l.amount),
            serial: formatSerialsDisplay(l.serialsJson),
          };
        }),
      ),
    };
  } else if (bizType === "purchaseReceipt") {
    const doc = await prisma.purchaseReceipt.findUnique({ where: { id }, include: { supplier: true, lines: true } });
    if (!doc) notFound();
    const products = await prisma.product.findMany({ where: { id: { in: doc.lines.map((l) => l.productId) } } });
    const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
    data = {
      shop,
      docNo: doc.docNo,
      supplier: doc.supplier?.name ?? "—",
      watermark: doc.status === "draft" ? "草稿" : doc.status === "voided" ? "作废" : "",
      lines: doc.lines
        .map(
          (l) =>
            `<tr><td>${pmap[l.productId]?.name}</td><td>${pmap[l.productId]?.unit || ""}</td><td>${qty(l.qty)}</td><td>${money(l.cost)}</td><td>${formatSerialsDisplay(l.serialsJson)}</td></tr>`,
        )
        .join(""),
      rowsJson: JSON.stringify(
        doc.lines.map((l) => {
          const p = pmap[l.productId];
          return {
            name: p?.name ?? "",
            brand: p?.brand ?? "",
            spec: p?.spec ?? "",
            code: p?.code ?? "",
            unit: p?.unit ?? "",
            qty: qty(l.qty),
            cost: money(l.cost),
            amount: money(Number(l.qty) * Number(l.cost)),
            serial: formatSerialsDisplay(l.serialsJson),
          };
        }),
      ),
    };
  } else if (bizType === "receipt") {
    data = await receiptPrintData(id);
    } else notFound();
  } catch (e) {
    if (bizType === "warrantyLabel" && e instanceof Error) labelError = e.message;
    else notFound();
  }

  const layout = parseLayout("configJson" in tpl ? tpl.configJson : "{}", bizType);
  const html = labelError ? "" : renderLayoutHtml(layout, data);
  const formats = await prisma.reportFormat.findMany({
    where: { bizType },
    select: { id: true, name: true, isDefault: true },
    orderBy: { name: "asc" },
  });
  const currentFormatId = tpl.id || formats.find((f) => f.isDefault)?.id || formats[0]?.id;
  return (
    <div className="mx-auto bg-white p-4 text-black print:max-w-none print:p-0" style={{ maxWidth: paperPreviewMaxWidth(layout.paper) }}>
      <PrintToolbar
        paper={paperHint(layout.paper)}
        formats={formats}
        currentFormatId={currentFormatId}
      />
      {labelError ? <p className="text-sm text-red-700">{labelError}</p> : <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
