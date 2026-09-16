import { prisma } from "@/lib/prisma";
import { KNOWLEDGE_ARTICLES, KNOWLEDGE_CATEGORIES } from "@/lib/knowledge-seed";

/** 补全知识分类和条目；已有条目按 code 更新正文（含图文）。不删店里自建条目。 */
export async function ensureKnowledge() {
  let categories = 0;
  let articles = 0;
  for (const c of KNOWLEDGE_CATEGORIES) {
    await prisma.knowledgeCategory.upsert({
      where: { code: c.code },
      create: c,
      update: { name: c.name, sort: c.sort },
    });
    categories += 1;
  }
  for (const a of KNOWLEDGE_ARTICLES) {
    const cat = await prisma.knowledgeCategory.findUnique({ where: { code: a.cat } });
    if (!cat) continue;
    const payload = {
      title: a.title,
      categoryId: cat.id,
      symptoms: a.symptoms,
      solution: a.solution,
      tags: a.tags,
      relatedCategoryCode: a.relatedCategoryCode ?? "",
      relatedSkuCode: a.relatedSkuCode ?? "",
      sort: a.sort,
      enabled: true,
    };
    await prisma.knowledgeArticle.upsert({
      where: { code: a.code },
      create: { code: a.code, ...payload },
      update: payload,
    });
    articles += 1;
  }
  return { categories, articles };
}
