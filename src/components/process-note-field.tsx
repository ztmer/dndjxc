"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  listKnowledgeCategories,
  saveWorkNoteToKnowledge,
  searchKnowledgeArticles,
  type KnowledgeHit,
} from "@/actions/knowledge";

function articleToNote(a: KnowledgeHit) {
  const bits = [`【${a.title}】`];
  if (a.symptoms.trim()) bits.push(`现象：${a.symptoms.trim()}`);
  if (a.solution.trim()) bits.push(`办法：${a.solution.trim()}`);
  return bits.join("\n");
}

/** 工单过程记录：手写，或检索知识库对照；没有则存入知识库。 */
export function ProcessNoteField({
  value,
  onChange,
  categoryId,
  onCategoryIdChange,
}: {
  value: string;
  onChange: (next: string) => void;
  categoryId?: string;
  onCategoryIdChange?: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<KnowledgeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fromId, setFromId] = useState<string | null>(null);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [catId, setCatId] = useState(categoryId ?? "");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void listKnowledgeCategories().then((rows) => {
      setCats(rows);
      setCatId((prev) => {
        const next = prev || rows.find((c) => c.name.includes("硬件"))?.id || rows[0]?.id || "";
        if (next) onCategoryIdChange?.(next);
        return next;
      });
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setLoading(true);
      void searchKnowledgeArticles(q)
        .then(setHits)
        .finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(t);
  }, [q, open]);

  async function saveToKb() {
    const r = await saveWorkNoteToKnowledge({ note: value, categoryId: catId || undefined });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setFromId(r.id);
    if (r.existed) toast.message(`知识库已有「${r.title}」，不用再存`);
    else toast.success(`已存入知识库：${r.title}`);
  }

  return (
    <Field>
      <FieldLabel>过程记录</FieldLabel>
      <div className="relative" ref={boxRef}>
        <Input
          value={q}
          placeholder="检索知识库，如 蓝屏、没网、重装…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 180);
          }}
        />
        {open ? (
          <ul className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-background py-1 shadow-md">
            {loading ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">正在对照知识库…</li>
            ) : hits.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                {q.trim() ? "知识库没有这条，下面手写后点「存入知识库」" : "知识库还没有条目，手写过程后存进去"}
              </li>
            ) : (
              hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(articleToNote(h));
                      setFromId(h.id);
                      setQ(h.title);
                      setOpen(false);
                    }}
                  >
                    <span className="text-sm font-medium">{h.title}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {h.categoryName}
                      {h.tags ? ` · ${h.tags}` : ""}
                      {h.symptoms ? ` · ${h.symptoms}` : ""}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      <Textarea
        className="mt-2"
        rows={4}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (fromId) setFromId(null);
        }}
        placeholder="故障现象、已做处理、更换了什么"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {cats.length ? (
          <select
            className="h-8 rounded-lg border bg-background px-2 text-sm"
            value={catId}
            onChange={(e) => {
              setCatId(e.target.value);
              onCategoryIdChange?.(e.target.value);
            }}
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : null}
        <Button type="button" variant="outline" size="sm" disabled={!value.trim()} onClick={() => void saveToKb()}>
          {fromId ? "已对照知识库" : "存入知识库"}
        </Button>
      </div>
    </Field>
  );
}
