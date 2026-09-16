"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLineIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function HeaderSearch({ className }: { className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return <div className={cn("ml-auto h-8 w-full max-w-xs rounded-md bg-muted", className)} />;
  }
  return (
    <form action="/serials" className={cn("ml-auto flex w-full max-w-xs gap-1.5", className)}>
      <Input name="sn" placeholder="扫唯一 SN：卖给谁 / 谁卖给我" className="bg-background" autoComplete="off" />
      <Button type="submit" variant="outline">
        <ScanLineIcon data-icon="inline-start" />
        查询
      </Button>
    </form>
  );
}
