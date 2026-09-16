"use server";

import { assertLoggedIn } from "@/lib/require-session";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveKnowledgeArticle(input: {
  id?: string;
  title: string;
  categoryId: string;
  symptoms: string;
  solution: string;
  tags?: string;
  relatedCategoryCode?: string;
  relatedSkuCode?: string;
  enabled?: boolean;
}) {
  await assertLoggedIn();

  try {
    const title = input.title.trim();
    if (!title) throw new Error("请填写标题");
    if (!input.categoryId) throw new Error("请选择分类");
    if (!input.solution.trim()) throw new Error("请填写解决办法");
    const data = {
      title,
      categoryId: input.categoryId,
      symptoms: input.symptoms.trim(),
      solution: input.solution.trim(),
      tags: (input.tags ?? "").trim(),
      relatedCategoryCode: (input.relatedCategoryCode ?? "").trim(),
      relatedSkuCode: (input.relatedSkuCode ?? "").trim(),
      enabled: input.enabled !== false,
    };
    const id = input.id
      ? (await prisma.knowledgeArticle.update({ where: { id: input.id }, data })).id
      : (
          await prisma.knowledgeArticle.create({
            data: {
              ...data,
              code: `KB${Date.now().toString(36).toUpperCase()}`,
              sort: (await prisma.knowledgeArticle.count({ where: { categoryId: input.categoryId } })) + 1,
            },
          })
        ).id;
    revalidatePath("/knowledge");
    revalidatePath(`/knowledge/${id}`);
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteKnowledgeArticle(id: string) {
  await assertLoggedIn();

  try {
    const row = await prisma.knowledgeArticle.findUnique({ where: { id } });
    if (!row) throw new Error("条目不存在");
    await prisma.knowledgeArticle.delete({ where: { id } });
    revalidatePath("/knowledge");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export type KnowledgeHit = {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  symptoms: string;
  solution: string;
  tags: string;
};

function toHit(a: {
  id: string;
  title: string;
  categoryId: string;
  symptoms: string;
  solution: string;
  tags: string;
  category: { name: string };
}): KnowledgeHit {
  return {
    id: a.id,
    title: a.title,
    categoryId: a.categoryId,
    categoryName: a.category.name,
    symptoms: a.symptoms,
    solution: a.solution,
    tags: a.tags,
  };
}

/** 工单过程记录对照知识库。 */
export async function searchKnowledgeArticles(q?: string): Promise<KnowledgeHit[]> {
  await assertLoggedIn();

  const kw = q?.trim();
  const rows = await prisma.knowledgeArticle.findMany({
    where: {
      enabled: true,
      ...(kw
        ? {
            OR: [
              { title: { contains: kw } },
              { symptoms: { contains: kw } },
              { solution: { contains: kw } },
              { tags: { contains: kw } },
            ],
          }
        : {}),
    },
    include: { category: { select: { name: true } } },
    orderBy: [{ updatedAt: "desc" }, { sort: "asc" }],
    take: 20,
  });
  return rows.map(toHit);
}

export async function listKnowledgeCategories() {
  await assertLoggedIn();

  return prisma.knowledgeCategory.findMany({
    orderBy: { sort: "asc" },
    select: { id: true, name: true, code: true },
  });
}

/** 过程记录在知识库没有时，存成一条维修常识。 */
export async function saveWorkNoteToKnowledge(input: { note: string; title?: string; categoryId?: string }) {
  await assertLoggedIn();

  try {
    const note = input.note.trim();
    if (!note) throw new Error("过程记录是空的");
    const title = (input.title?.trim() || note.split(/\n/)[0] || "工单过程").slice(0, 40);
    const dup = await prisma.knowledgeArticle.findFirst({
      where: {
        enabled: true,
        OR: [{ title }, { solution: note }, { symptoms: note }],
      },
      select: { id: true, title: true },
    });
    if (dup) return { ok: true as const, id: dup.id, existed: true as const, title: dup.title };
    let categoryId = input.categoryId;
    if (!categoryId) {
      const hw = await prisma.knowledgeCategory.findFirst({
        where: { OR: [{ code: "HW" }, { code: "BASIC" }] },
        orderBy: { sort: "asc" },
      });
      const any = hw ?? (await prisma.knowledgeCategory.findFirst({ orderBy: { sort: "asc" } }));
      if (!any) throw new Error("请先在知识库建一个分类");
      categoryId = any.id;
    }
    const created = await prisma.knowledgeArticle.create({
      data: {
        code: `KB${Date.now().toString(36).toUpperCase()}`,
        title,
        categoryId,
        symptoms: note.length > 80 ? note.slice(0, 80) : note,
        solution: note,
        tags: "工单",
        sort: (await prisma.knowledgeArticle.count({ where: { categoryId } })) + 1,
      },
    });
    revalidatePath("/knowledge");
    return { ok: true as const, id: created.id, existed: false as const, title: created.title };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "存入知识库失败" };
  }
}
