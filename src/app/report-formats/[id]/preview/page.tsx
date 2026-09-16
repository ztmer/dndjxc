import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { paperHint, paperPreviewMaxWidth } from "@/lib/report-formats";
import { PREVIEW_DATA, parseLayout, renderLayoutHtml } from "@/lib/report-layout";
import { PrintToolbar } from "@/components/print-toolbar";

export const dynamic = "force-dynamic";

export default async function PreviewReportFormatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.reportFormat.findUnique({ where: { id } });
  if (!row) notFound();
  const layout = parseLayout(row.configJson, row.bizType);
  const html = renderLayoutHtml(layout, PREVIEW_DATA);
  return (
    <div className="mx-auto bg-white p-4 text-black print:max-w-none print:p-0" style={{ maxWidth: paperPreviewMaxWidth(layout.paper) }}>
      <PrintToolbar paper={paperHint(layout.paper)} />
      <p className="no-print mb-3 text-sm text-neutral-500">预览用示例数据，不是真实单据。</p>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
