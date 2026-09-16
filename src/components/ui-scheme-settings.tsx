"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UI_SCHEMES, type UiScheme } from "@/lib/ui-scheme";
import { useUiScheme } from "@/components/ui-scheme-provider";
import { cn } from "@/lib/utils";

export function UiSchemeSettings() {
  const { scheme, setScheme } = useUiScheme();
  return (
    <Card>
      <CardHeader>
        <CardTitle>界面方案</CardTitle>
        <CardDescription>两套壳可以随时切，业务单据不变。顶栏开关和这里是同一项。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {UI_SCHEMES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScheme(s.id as UiScheme)}
            className={cn(
              "rounded-xl border p-4 text-left",
              scheme === s.id ? "border-primary bg-primary/5" : "hover:bg-muted/50",
            )}
          >
            <div className="font-medium">{s.name}</div>
            <p className="mt-1 text-sm text-muted-foreground">{s.hint}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
