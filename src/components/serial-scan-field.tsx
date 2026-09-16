"use client";

import { useState } from "react";
import { parseSerials } from "@/lib/serials";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/** 一块硬盘一个唯一 SN：扫码回车追加，也可整批粘贴。 */
export function SerialScanField({
  sns,
  onChange,
  expectedQty,
  unit = "块",
  defer,
}: {
  sns: string[];
  onChange: (sns: string[]) => void;
  expectedQty?: number;
  unit?: string;
  /** 先开单后送货：允许暂时不扫 */
  defer?: boolean;
}) {
  const [buf, setBuf] = useState("");
  const need = expectedQty && expectedQty > 0 ? expectedQty : undefined;
  const ok = defer ? true : need ? sns.length === need : sns.length > 0;

  function addRaw(raw: string) {
    const extra = parseSerials(raw);
    if (!extra.length) return;
    const next = parseSerials([...sns, ...extra].join("\n"));
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{defer ? "唯一 SN（可不扫，按数量出库）" : "唯一 SN（一台一码）"}</span>
        <Badge variant={ok ? "secondary" : "destructive"}>
          已扫 {sns.length}
          {need ? ` / ${need}` : ""} {unit}
        </Badge>
      </div>
      <Input
        value={buf}
        placeholder={defer ? "可不扫。要记保修再扫唯一 SN，回车下一块" : "对准包装上的唯一 SN 扫描，回车下一块"}
        onChange={(e) => setBuf(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          addRaw(buf);
          setBuf("");
        }}
      />
      {sns.length ? (
        <div className="flex flex-wrap gap-1">
          {sns.map((sn) => (
            <Badge key={sn} variant="outline" className="gap-1">
              {sn}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onChange(sns.filter((x) => x !== sn))}
                aria-label={`去掉 ${sn}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{defer ? "没扫就按上面数量出库。扫了的码会记到客户保修。" : "进 10 块就扫 10 次。不要扫通用 SN。"}</p>
      )}
      <Textarea
        className="min-h-20"
        placeholder="也可一次粘贴，每行一个唯一 SN"
        value={sns.join("\n")}
        onChange={(e) => onChange(parseSerials(e.target.value))}
      />
      {sns.length ? (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onChange([])}>
          清空已扫
        </Button>
      ) : null}
    </div>
  );
}
