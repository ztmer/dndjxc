import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** 列表分页：当前页附近页码 + 首尾 */
export function Pager({
  page,
  pageCount,
  total,
  pageSize,
  hrefForPage,
  noun = "条",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  hrefForPage: (page: number) => string;
  noun?: string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const nums: (number | "…")[] = [];
  const want = new Set<number>([1, pageCount]);
  for (let i = page - 2; i <= page + 2; i++) {
    if (i >= 1 && i <= pageCount) want.add(i);
  }
  const sorted = [...want].sort((a, b) => a - b);
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) nums.push("…");
    nums.push(n);
    prev = n;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        共 {total} {noun}，本页 {from}–{to}
      </p>
      {pageCount > 1 ? (
        <nav className="flex flex-wrap items-center gap-1" aria-label="分页">
          {page > 1 ? (
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={hrefForPage(page - 1)}>
              上一页
            </Link>
          ) : (
            <span className={buttonVariants({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-50"}>
              上一页
            </span>
          )}
          {nums.map((n, i) =>
            n === "…" ? (
              <span key={`e-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Link
                key={n}
                className={buttonVariants({ variant: n === page ? "default" : "outline", size: "sm" })}
                href={hrefForPage(n)}
                aria-current={n === page ? "page" : undefined}
              >
                {n}
              </Link>
            ),
          )}
          {page < pageCount ? (
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={hrefForPage(page + 1)}>
              下一页
            </Link>
          ) : (
            <span className={buttonVariants({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-50"}>
              下一页
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
