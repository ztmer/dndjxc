import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReportFormatForm } from "@/components/forms/report-format-form";
import { PageHeader } from "@/components/page-header";
import { bizLabel } from "@/lib/report-formats";

export const dynamic = "force-dynamic";

export default async function EditReportFormatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.reportFormat.findUnique({ where: { id } });
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="修改报表格式" description={`${bizLabel(row.bizType)} · ${row.name}`} />
      <ReportFormatForm
        initial={{
          id: row.id,
          bizType: row.bizType,
          name: row.name,
          paper: row.paper,
          configJson: row.configJson,
          remark: row.remark,
          isDefault: row.isDefault,
        }}
      />
    </div>
  );
}
