import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KbRichText } from "@/components/kb-rich-text";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MobileKnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await prisma.knowledgeArticle.findUnique({ where: { id }, include: { category: true } });
  if (!article) notFound();
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">{article.title}</h1>
        <p className="text-sm text-muted-foreground">
          {article.category.name}
          {article.tags ? ` · ${article.tags}` : ""}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">常见现象</CardTitle>
        </CardHeader>
        <CardContent>
          <KbRichText text={article.symptoms || "—"} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">解决办法</CardTitle>
        </CardHeader>
        <CardContent>
          <KbRichText text={article.solution} />
        </CardContent>
      </Card>
    </div>
  );
}
