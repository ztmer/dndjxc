"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Result = { ok: true; id?: string } | { ok: false; error: string };

function openPrint(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

export function DocButtons({
  id,
  status,
  printHref,
  printLabel,
  extraPrints,
  collectHref,
  collectLabel,
  onSubmit,
  onSubmitPay,
  onUnsubmit,
  onVoid,
  submitLabel,
  submitPayLabel,
}: {
  id?: string;
  status?: string;
  printHref?: string;
  printLabel?: string;
  extraPrints?: { href: string; label: string }[];
  collectHref?: string;
  collectLabel?: string;
  onSubmit?: (id: string) => Promise<Result>;
  onSubmitPay?: (id: string) => Promise<Result>;
  onUnsubmit?: (id: string) => Promise<Result>;
  onVoid?: (id: string) => Promise<Result>;
  submitLabel?: string;
  submitPayLabel?: string;
}) {
  const router = useRouter();
  if (!id) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {printHref ? (
        <Button type="button" variant="outline" onClick={() => openPrint(printHref)}>
          {printLabel ?? "打印"}
        </Button>
      ) : null}
      {extraPrints?.map((p) => (
        <Button key={p.href} type="button" variant="outline" onClick={() => openPrint(p.href)}>
          {p.label}
        </Button>
      ))}
      {status === "submitted" && collectHref ? (
        <Link className={cn(buttonVariants())} href={collectHref}>
          {collectLabel ?? "收款"}
        </Link>
      ) : null}
      {status === "draft" && onSubmit ? (
        <Button
          type="button"
          variant={onSubmitPay ? "outline" : "default"}
          onClick={async () => {
            const r = await onSubmit(id);
            if (r.ok) {
              toast.success(onSubmitPay ? "已完工，钱记在未收" : "已确认");
              router.refresh();
            } else toast.error(r.error);
          }}
        >
          {submitLabel ?? "确认"}
        </Button>
      ) : null}
      {status === "draft" && onSubmitPay ? (
        <Button
          type="button"
          onClick={async () => {
            const r = await onSubmitPay(id);
            if (r.ok) {
              toast.success("已完工并收款");
              router.refresh();
            } else toast.error(r.error);
          }}
        >
          {submitPayLabel ?? "完工并收款"}
        </Button>
      ) : null}
      {status === "submitted" && onUnsubmit ? (
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            if (!window.confirm("反审后库存和账会冲回，本单回到草稿，改完再确认。确定反审？")) return;
            const r = await onUnsubmit(id);
            if (r.ok) {
              toast.success("已反审，可以改明细");
              router.refresh();
            } else toast.error(r.error);
          }}
        >
          反审
        </Button>
      ) : null}
      {status === "submitted" && onVoid ? (
        <Button
          type="button"
          variant="destructive"
          onClick={async () => {
            const r = await onVoid(id);
            if (r.ok) {
              toast.success("已作废");
              router.refresh();
            } else toast.error(r.error);
          }}
        >
          作废
        </Button>
      ) : null}
    </div>
  );
}
