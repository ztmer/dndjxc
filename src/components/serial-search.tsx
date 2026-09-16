"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markSerialRma } from "@/actions/master";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CameraScanButton } from "@/components/camera-scan-button";

export function SerialSearch({
  query,
  foundUnique,
  action = "/serials",
  enableCamera,
}: {
  query?: string;
  foundUnique?: boolean;
  action?: string;
  enableCamera?: boolean;
}) {
  const [q, setQ] = useState(query ?? "");
  const router = useRouter();

  function applyScan(text: string) {
    const sn = text.trim();
    if (!sn) return;
    setQ(sn);
    toast.success("已扫到串号");
    const sep = action.includes("?") ? "&" : "?";
    router.push(`${action}${sep}sn=${encodeURIComponent(sn)}`);
  }

  return (
    <div className="flex flex-col gap-2">
      {enableCamera ? <CameraScanButton onScan={applyScan} /> : null}
      <form className="flex flex-wrap gap-2" action={action}>
        <Input
          name="sn"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="唯一 SN 或通用 SN"
          className="h-11 flex-1 text-base"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
        />
        <Button type="submit" className="h-11">
          查询
        </Button>
        {foundUnique && query ? (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={async () => {
              const r = await markSerialRma(query);
              if (r.ok) toast.success("已标记返厂");
              else toast.error(r.error);
            }}
          >
            标记返厂
          </Button>
        ) : null}
      </form>
    </div>
  );
}
