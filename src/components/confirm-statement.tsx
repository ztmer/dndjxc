"use client";

import { confirmStatement, unsubmitStatement } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ConfirmStatement({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  if (status === "confirmed") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          if (!window.confirm("反审后对账单回到草稿，可再确认。确定反审？")) return;
          const r = await unsubmitStatement(id);
          if (r.ok) {
            toast.success("已反审");
            router.refresh();
          } else toast.error(r.error);
        }}
      >
        反审
      </Button>
    );
  }
  if (status !== "draft") return null;
  return (
    <Button
      onClick={async () => {
        const r = await confirmStatement(id);
        if (r.ok) {
          toast.success("已确认");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      确认对账
    </Button>
  );
}
