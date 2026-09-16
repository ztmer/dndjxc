"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteReportFormat, setReportFormatDefault } from "@/actions/master";
import { Button } from "@/components/ui/button";

export function ReportFormatActions({ id, isDefault }: { id: string; isDefault: boolean }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {isDefault ? null : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            const r = await setReportFormatDefault(id);
            if (r.ok) {
              toast.success("已设为默认");
              router.refresh();
            } else toast.error(r.error);
          }}
        >
          设为默认
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={async () => {
          if (!window.confirm("删除这份格式？该业务至少要留一份。")) return;
          const r = await deleteReportFormat(id);
          if (r.ok) {
            toast.success("已删除");
            router.refresh();
          } else toast.error(r.error);
        }}
      >
        删除
      </Button>
    </div>
  );
}
