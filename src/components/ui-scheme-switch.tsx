"use client";

import { cn } from "@/lib/utils";
import { UI_SCHEMES, type UiScheme } from "@/lib/ui-scheme";
import { useUiScheme } from "@/components/ui-scheme-provider";

export function UiSchemeSwitch({ compact }: { compact?: boolean }) {
  const { scheme, setScheme } = useUiScheme();
  return (
    <div className={cn("flex shrink-0 rounded-lg border bg-background p-0.5", compact ? "text-xs" : "text-sm")}>
      {UI_SCHEMES.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={scheme === s.id}
          className={cn(
            "rounded-md px-2.5 py-1 font-medium transition-colors",
            scheme === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setScheme(s.id as UiScheme)}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}
