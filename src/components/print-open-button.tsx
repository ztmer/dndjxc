"use client";

import { Button } from "@/components/ui/button";

export function PrintOpenButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button type="button" variant="outline" onClick={() => window.open(href, "_blank", "noopener,noreferrer")}>
      {children}
    </Button>
  );
}
