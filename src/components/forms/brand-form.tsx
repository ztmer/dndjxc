"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProductBrand, saveProductBrand } from "@/actions/master";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BrandForm() {
  const router = useRouter();
  const [name, setName] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveProductBrand({ name });
        if (r.ok) {
          toast.success("已新增品牌");
          setName("");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <Input className="w-48" placeholder="品牌名称，如 金士顿" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit">新增</Button>
    </form>
  );
}

export function DeleteBrandButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={async () => {
        const r = await deleteProductBrand(id);
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
