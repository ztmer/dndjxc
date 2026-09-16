import { prisma } from "@/lib/prisma";
import { KnowledgeForm } from "@/components/forms/knowledge-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

function qs(base: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/knowledge?${s}` : "/knowledge";
}

export default async function KnowledgePage({
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="知识库"
        description="软件、网络、硬件和店内常识。条目可配示意图和现场照片。开单仍走工单；这里只给办法，不扣库存。"
        actionHref="/work-orders/new"
        actionLabel="开工单"
      />
      <div className="flex flex-wrap gap-2">
        <Link className={buttonVariants({ variant: cat ? "outline" : "default", size: "sm" })} href="/knowledge">
          全部
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            className={buttonVariants({ variant: cat === c.id ? "default" : "outline", size: "sm" })}
            href={qs({ cat: c.id, q })}
          >
            {c.name}
          </Link>
        ))}
      </div>
      <form className="flex max-w-lg gap-2" action="/knowledge">
        {cat ? <input type="hidden" name="cat" value={cat} /> : null}
        <Input name="q" defaultValue={q} placeholder="现象 / 关键词，如 蓝屏、没网、散片保修" />
        <Button type="submit" variant="outline">
          搜索
        </Button>
      </form>
      <div className="grid gap-3">
        {rows.map((a) => (
          <Card key={a.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                <Link className="text-primary underline-offset-4 hover:underline" href={`/knowledge/${a.id}`}>
                  {a.title}
                </Link>
                {!a.enabled ? (
                  <Badge variant="secondary" className="ml-2">
                    停用
                  </Badge>
                ) : null}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {a.category.name}
                {a.tags ? ` · ${a.tags}` : ""}
              </p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{a.symptoms || a.solution.slice(0, 80)}</CardContent>
          </Card>
        ))}
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">没有匹配的条目。</p> : null}
        <ListPager path="/knowledge" page={page} total={total} query={{ cat, q }} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>新建条目</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </CardContent>
      </Card>
    </div>
  );
}
