"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveKnowledgeArticle, deleteKnowledgeArticle } from "@/actions/knowledge";
import { markdownImage } from "@/lib/kb-rich-text";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function KnowledgeForm({
  categories,
  article,
}: {
  categories: { id: string; name: string }[];
  article?: {
    id: string;
    title: string;
    categoryId: string;
    symptoms: string;
    solution: string;
    tags: string;
    relatedCategoryCode: string;
    relatedSkuCode: string;
    enabled: boolean;
  };
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(article?.title ?? "");
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? categories[0]?.id ?? "");
  const [symptoms, setSymptoms] = useState(article?.symptoms ?? "");
  const [solution, setSolution] = useState(article?.solution ?? "");
  const [tags, setTags] = useState(article?.tags ?? "");
  const [relatedCategoryCode, setRelCat] = useState(article?.relatedCategoryCode ?? "");
  const [relatedSkuCode, setRelSku] = useState(article?.relatedSkuCode ?? "");
  const [enabled, setEnabled] = useState(article?.enabled ?? true);
  const [uploading, setUploading] = useState(false);

  async function insertPhoto(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/knowledge-images", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "上传失败");
      const url = json.url;
      setSolution((s) => s + markdownImage(url, "现场照片"));
      toast.success("已插入图片，保存条目后可见");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="flex max-w-3xl flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveKnowledgeArticle({
          id: article?.id,
          title,
          categoryId,
          symptoms,
          solution,
          tags,
          relatedCategoryCode,
          relatedSkuCode,
          enabled,
        });
        if (r.ok) {
          toast.success("已保存知识条目");
          router.push(`/knowledge/${r.id}`);
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel>标题</FieldLabel>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Field>
          <Field>
            <FieldLabel>分类</FieldLabel>
            <select className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel>标签</FieldLabel>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="逗号分隔，如 蓝屏,内存" />
          </Field>
          <Field>
            <FieldLabel>关联商品分类编码</FieldLabel>
            <Input value={relatedCategoryCode} onChange={(e) => setRelCat(e.target.value)} placeholder="如 PC-CPU" />
          </Field>
          <Field>
            <FieldLabel>关联目录编码</FieldLabel>
            <Input value={relatedSkuCode} onChange={(e) => setRelSku(e.target.value)} placeholder="如 CPU-I5" />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>常见现象</FieldLabel>
            <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={3} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>解决办法（可插图，写法 ![说明](/knowledge/xxx.svg)）</FieldLabel>
            <Textarea value={solution} onChange={(e) => setSolution(e.target.value)} rows={10} required />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void insertPhoto(f);
              }}
            />
            <Button type="button" variant="outline" size="sm" className="mt-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? "上传中…" : "插入现场照片（JPEG）"}
            </Button>
          </Field>
        </div>
      </FieldGroup>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(!!v)} />
        启用
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">{article ? "保存条目" : "新建条目"}</Button>
        {article ? (
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              if (!confirm(`删除知识「${article.title}」？`)) return;
              const r = await deleteKnowledgeArticle(article.id);
              if (r.ok) {
                toast.success("已删除");
                router.push("/knowledge");
                router.refresh();
              } else toast.error(r.error);
            }}
          >
            删除
          </Button>
        ) : null}
      </div>
    </form>
  );
}
