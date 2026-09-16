"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProduct } from "@/actions/master";
import { Button } from "@/components/ui/button";

export function DeleteShopProduct({ id, name, afterHref = "/products" }: { id: string; name: string; afterHref?: string }) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="destructive"
      onClick={async () => {
        if (!confirm(`只从本店商品里去掉「${name}」。产品目录里的型号还在。确定删除？`)) return;
        const r = await deleteProduct(id);
        if (r.ok) {
          toast.success("已从本店商品删除，产品目录未改");
          router.push(afterHref);
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      删除本店商品
    </Button>
  );
}
