"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { savePrintTemplate } from "@/actions/master";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export function PrintTemplateForm({
  defaults,
}: {
  defaults: { bizType: string; name: string; html: string }[];
}) {
  const router = useRouter();
  const keyOf = (d: { bizType: string; name: string }) => `${d.bizType}::${d.name}`;
  const [pickedKey, setPickedKey] = useState(defaults[0] ? keyOf(defaults[0]) : "");
  const picked = defaults.find((d) => keyOf(d) === pickedKey) ?? defaults[0];
  const [bizType, setBizType] = useState(picked?.bizType ?? "salesOrder");
  const [name, setName] = useState(picked?.name ?? "");
  const [html, setHtml] = useState(picked?.html ?? "");
  const [isDefault, setIsDefault] = useState(true);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await savePrintTemplate({ bizType, name, html, isDefault });
        if (r.ok) {
          toast.success("模板已保存");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>业务</FieldLabel>
          <select
            className="h-8 rounded-lg border bg-background px-2 text-sm"
            value={pickedKey}
            onChange={(e) => {
              const next = e.target.value;
              setPickedKey(next);
              const d = defaults.find((x) => keyOf(x) === next);
              if (d) {
                setBizType(d.bizType);
                setName(d.name);
                setHtml(d.html);
              }
            }}
          >
            {defaults.map((d) => (
              <option key={keyOf(d)} value={keyOf(d)}>
                {d.bizType} · {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel>模板名称</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(!!v)} />
          设为该业务默认
        </label>
        <Field>
          <FieldLabel>HTML（占位符如 {"{{docNo}}"}）</FieldLabel>
          <Textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={10} className="font-mono text-xs" />
        </Field>
      </FieldGroup>
      <Button type="submit">保存到库</Button>
    </form>
  );
}
