import { ReportFormatForm } from "@/components/forms/report-format-form";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default function NewReportFormatPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="新增报表格式" description="左边改栏位和列宽，右边即时预览。" />
      <ReportFormatForm />
    </div>
  );
}
