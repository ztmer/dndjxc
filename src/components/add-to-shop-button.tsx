"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { addCatalogSkuToShop } from "@/actions/catalog";
import { Button, buttonVariants } from "@/components/ui/button";

export function AddToShopButton({ catalogSkuId, productId }: { catalogSkuId: string; productId?: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (productId) {
    return (
      <Link className={buttonVariants()} href={`/products/${productId}`}>
        已在本店，去改价/库存
      </Link>
    );
  }
  return (
    <Button
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const r = await addCatalogSkuToShop(catalogSkuId);
        setPending(false);
        if (r.ok) {
          toast.success("已加入本店经营");
          router.push(`/products/${r.id}`);
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      {pending ? "加入中…" : "加入本店经营"}
    </Button>
  );
}
