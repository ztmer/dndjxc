import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

function qs(base: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/m/knowledge?${s}` : "/m/knowledge";
}

export default async function MobileKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string; page?: string }>;
}) {
  const { cat, q, page: pageRaw } = await searchParams;
  const categories = await prisma.knowledgeCategory.findMany({ orderBy: { sort: "asc" } });
  const kw = q?.trim();
  const where = {
      AND: [
        cat ? { categoryId: cat } : {},
        kw
          ? {
              OR: [
                { title: { contains: kw } },
                { symptoms: { contains: kw } },
                { solution: { contains: kw } },
                { tags: { contains: kw } },
              ],
            }
          : {},
      ],
  };
  const total = await prisma.knowledgeArticle.count({ where });
  const { page, skip, take } = listPageState(pageRaw, total);
  const rows = await prisma.knowledgeArticle.findMany({
    where,
    include: { category: true },
    orderBy: [{ category: { sort: "asc" } }, { sort: "asc" }],
    skip,
    take,
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Link className={buttonVariants({ variant: cat ? "outline" : "default" })} href="/m/knowledge">
          全部
        </Link>
        {categories.map((c) => (
          <Link key={c.id} className={buttonVariants({ variant: cat === c.id ? "default" : "outline" })} href={qs({ cat: c.id, q })}>
            {c.name}
          </Link>
        ))}
      </div>
      <form className="flex gap-2" action="/m/knowledge">
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        <Input name="q" defaultValue={q} className="h-11" placeholder="蓝屏 / 没网 / 现象" />
        <Button type="submit" variant="outline" className="h-11">
          搜索
        </Button>
      </form>
      {total === 0 ? <p className="text-sm text-muted-foreground">没有匹配的条目</p> : null}
      {rows.map((a) => (
        <Link key={a.id} href={`/m/knowledge/${a.id}`} className="rounded-lg border bg-card px-3 py-3">
          <p className="font-medium">
            {a.title}
            {!a.enabled ? (
              <Badge variant="secondary" className="ml-2">
                停用
              </Badge>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">{a.category.name}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{a.symptoms || a.solution.slice(0, 80)}</p>
        </Link>
      ))}
      <ListPager path="/m/knowledge" page={page} total={total} query={{ cat, q }} />
    </div>
  );
}
