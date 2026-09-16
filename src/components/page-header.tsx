import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="shop-page-banner">
      <div className="min-w-0">
        <h1 suppressHydrationWarning className="text-[18px] font-bold leading-tight text-white">
          {title}
        </h1>
        {description ? <p className="mt-1 text-xs text-white/75">{description}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link className={cn("shop-wb-btn shrink-0")} href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
