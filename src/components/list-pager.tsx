import { Pager } from "@/components/pager";
import { LIST_PAGE_SIZE, listHref } from "@/lib/list-page";

/** 超过 20 条才出翻页；不超过则不占地方 */
export function ListPager({
  path,
  page,
  total,
  query,
  noun = "条",
  pageKey = "page",
}: {
  path: string;
  page: number;
  total: number;
  query?: Record<string, string | undefined>;
  noun?: string;
  pageKey?: string;
}) {
  if (total <= LIST_PAGE_SIZE) return null;
  const pageCount = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
  return (
    <Pager
      page={page}
      pageCount={pageCount}
      total={total}
      pageSize={LIST_PAGE_SIZE}
      noun={noun}
      hrefForPage={(p) => listHref(path, { ...query, [pageKey]: p })}
    />
  );
}
