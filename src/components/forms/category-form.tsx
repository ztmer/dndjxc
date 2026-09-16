"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProductCategory, restoreDefaultCategories, saveProductCategory } from "@/actions/master";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClass =
  "h-8 min-w-40 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring";

export function CategoryForm({ parents }: { parents: { id: string; name: string }[] }) {
  const router = useRouter();
  const [parentId, setParentId] = useState(parents[0]?.id ?? "");
  const [name, setName] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveProductCategory({ parentId: parentId || undefined, name });
        if (r.ok) {
          toast.success("已新增分类");
          setName("");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <select className={selectClass} value={parentId} onChange={(e) => setParentId(e.target.value)}>
        <option value="">新主类</option>
        {parents.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} 下的子类
          </option>
        ))}
      </select>
      <Input className="w-48" placeholder="分类名称" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit">新增</Button>
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          const r = await restoreDefaultCategories();
          if (r.ok) {
            toast.success("已写入默认分类（不会删你自己加的）");
            router.refresh();
          } else toast.error(r.error);
        }}
      >
        补全默认分类
      </Button>
    </form>
  );
}

export function DeleteCategoryButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        const r = await deleteProductCategory(id);
        if (r.ok) {
          toast.success("已删除");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      删除
    </Button>
  );
}
