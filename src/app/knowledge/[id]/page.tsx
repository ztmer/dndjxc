import { prisma } from "@/lib/prisma";
import { KnowledgeForm } from "@/components/forms/knowledge-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KbRichText } from "@/components/kb-rich-text";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, categories] = await Promise.all([
    prisma.knowledgeArticle.findUnique({ where: { id }, include: { category: true } }),
    prisma.knowledgeCategory.findMany({ orderBy: { sort: "asc" } }),
  ]);
  if (!article) notFound();
  const relatedSku = article.relatedSkuCode
    ? await prisma.catalogSku.findUnique({ where: { code: article.relatedSkuCode }, select: { id: true, name: true, brand: true } })
    : null;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={article.title} description={`${article.category.name}${article.tags ? ` · ${article.tags}` : ""}`} />
      <Card>
        <CardHeader>
          <CardTitle>常见现象</CardTitle>
        </CardHeader>
        <CardContent>
          <KbRichText text={article.symptoms || "—"} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>解决办法</CardTitle>
        </CardHeader>
        <CardContent>
          <KbRichText text={article.solution} />
        </CardContent>
      </Card>
      {relatedSku ? (
        <p className="text-sm">
          相关型号：
          <Link className="text-primary underline-offset-4 hover:underline" href={`/catalog/${relatedSku.id}`}>
            {relatedSku.brand} {relatedSku.name}
          </Link>
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>改这条知识</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            article={{
              id: article.id,
              title: article.title,
              categoryId: article.categoryId,
              symptoms: article.symptoms,
              solution: article.solution,
              tags: article.tags,
              relatedCategoryCode: article.relatedCategoryCode,
              relatedSkuCode: article.relatedSkuCode,
              enabled: article.enabled,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
