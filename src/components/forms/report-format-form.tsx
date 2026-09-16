"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveReportFormat } from "@/actions/master";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PAPER_OPTIONS, REPORT_BIZ_TYPES } from "@/lib/report-formats";
import { PREVIEW_DATA, defaultLayout, parseLayout, renderLayoutHtml, type LayoutItem, type ReportLayout } from "@/lib/report-layout";

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

function sharePct(items: LayoutItem[], i: number) {
  const mine = items[i];
  if (!mine?.show) return 0;
  const sum = items.filter((x) => x.show).reduce((s, x) => s + Math.max(1, Number(x.width) || 10), 0);
  if (!sum) return 0;
  return Math.round((Math.max(1, Number(mine.width) || 10) / sum) * 100);
}

export function ReportFormatForm({
  initial,
}: {
  initial?: { id: string; bizType: string; name: string; paper: string; configJson: string; remark: string; isDefault: boolean };
}) {
  const router = useRouter();
  const [bizType, setBizType] = useState(initial?.bizType ?? "deliveryNote");
  const [name, setName] = useState(initial?.name ?? "");
  const [remark, setRemark] = useState(initial?.remark ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? true);
  const [layout, setLayout] = useState<ReportLayout>(() => parseLayout(initial?.configJson, initial?.bizType ?? "deliveryNote"));
  const preview = useMemo(() => renderLayoutHtml(layout, PREVIEW_DATA), [layout]);

  function patch(p: Partial<ReportLayout>) {
    setLayout((prev) => ({ ...prev, ...p }));
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveReportFormat({
          id: initial?.id,
          bizType,
          name,
          paper: layout.paper,
          remark,
          isDefault,
          configJson: JSON.stringify(layout),
        });
        if (r.ok) {
          toast.success("格式已保存");
          router.push("/report-formats");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">基本</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel>业务</FieldLabel>
                <select
                  className={sel}
                  value={bizType}
                  disabled={!!initial}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBizType(next);
                    setLayout(defaultLayout(next));
                  }}
                >
                  {REPORT_BIZ_TYPES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel>纸张</FieldLabel>
                <select
                  className={sel}
                  value={layout.paper}
                  onChange={(e) => {
                    const paper = e.target.value;
                    if (paper === "70x50") {
                      patch({
                        paper,
                        copies: 1,
                        copyLabels: [],
                        showSpine: false,
                        marginTop: 2,
                        marginRight: 2,
                        marginBottom: 2,
                        marginLeft: 2,
                      });
                    } else if (paper === "210x140") {
                      patch({ paper, copies: 1, copyLabels: [] });
                    } else patch({ paper });
                  }}
                >
                  {PAPER_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel>格式名称</FieldLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：送货单 210×140" />
              </Field>
              <Field>
                <FieldLabel>单据标题</FieldLabel>
                <Input value={layout.title} onChange={(e) => patch({ title: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>字号</FieldLabel>
                <Input type="number" min={8} max={18} value={layout.fontSize} onChange={(e) => patch({ fontSize: Number(e.target.value) || 13 })} />
              </Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(!!v)} />
              设为该业务打印时的默认格式
            </label>
            <p className="mt-3 mb-2 text-sm font-medium">纸面边距（毫米）</p>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["上", "marginTop"],
                  ["下", "marginBottom"],
                  ["左", "marginLeft"],
                  ["右", "marginRight"],
                ] as const
              ).map(([lab, key]) => (
                <Field key={key}>
                  <FieldLabel>{lab}</FieldLabel>
                  <Input type="number" min={0} max={40} value={layout[key]} onChange={(e) => patch({ [key]: Number(e.target.value) || 0 })} />
                </Field>
              ))}
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">要印的内容</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {(
                [
                  ["showShopName", "店名"],
                  ["showShopAddress", "店址"],
                  ["showShopPhone", "电话"],
                  ["showAmountCn", "金额大写"],
                  ["showTax", "含税/发票说明"],
                  ["showRemark", "备注"],
                  ["showLogo", "公司 Logo"],
                  ["showSeal", "公章"],
                ] as const
              ).map(([key, lab]) => (
                <label key={key} className="flex items-center gap-2">
                  <Checkbox checked={layout[key]} onCheckedChange={(v) => patch({ [key]: !!v })} />
                  {lab}
                </label>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <Checkbox checked={layout.showSpine} onCheckedChange={(v) => patch({ showSpine: !!v })} />
              右侧竖排联次（送货单常用）
            </label>
            {layout.showSpine ? (
              <Field className="mt-2">
                <FieldLabel>联次文字（一行一联，从右往左）</FieldLabel>
                <Textarea
                  rows={3}
                  value={layout.spineTexts.join("\n")}
                  onChange={(e) => patch({ spineTexts: e.target.value.split("\n") })}
                  placeholder={"红联 收款\n黄联 客户\n白联 留存"}
                />
              </Field>
            ) : null}
            {layout.paper === "210x140" ? (
              <p className="mt-3 text-sm text-muted-foreground">二等份纸 210×140mm，只打一页，下面几层复写。</p>
            ) : layout.paper === "70x50" ? (
              <p className="mt-3 text-sm text-muted-foreground">70×50mm 热敏标签。打印时在系统对话框里选该尺寸，一码一贴。</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel>连打页数</FieldLabel>
                  <Input type="number" min={1} max={3} value={layout.copies} onChange={(e) => patch({ copies: Number(e.target.value) || 1 })} />
                </Field>
                <Field>
                  <FieldLabel>每页角标</FieldLabel>
                  <Input
                    value={layout.copyLabels.join("，")}
                    onChange={(e) => patch({ copyLabels: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })}
                    placeholder="可空"
                  />
                </Field>
              </div>
            )}
            <Field className="mt-3">
              <FieldLabel>抬头说明</FieldLabel>
              <Textarea rows={2} value={layout.headerNote} onChange={(e) => patch({ headerNote: e.target.value })} placeholder="印在标题下，可空" />
            </Field>
          </section>

          <section className="rounded-lg border p-4">
            <h3 className="mb-1 text-sm font-medium">页眉字段</h3>
            <p className="mb-3 text-xs text-muted-foreground">勾选后印在标题下，排成文字行，不用表格。</p>
            <LayoutItemsEditor items={layout.metas} onChange={(metas) => patch({ metas })} kind="meta" />
          </section>

          {layout.cols.length ? (
            <section className="rounded-lg border p-4">
              <h3 className="mb-1 text-sm font-medium">明细常用列</h3>
              <p className="mb-3 text-xs text-muted-foreground">列宽是相对份数，不是毫米。改完看右侧预览和「占比」。</p>
              <LayoutItemsEditor items={layout.cols} onChange={(cols) => patch({ cols })} kind="col" />
            </section>
          ) : null}

          <section className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">签字栏</h3>
            {layout.signs.map((s, i) => (
              <div key={i} className="mb-2 flex items-center gap-2">
                <Input className="min-w-0 flex-1" value={s.label} onChange={(e) => patch({ signs: layout.signs.map((x, idx) => (idx === i ? { label: e.target.value } : x)) })} />
                <Button type="button" variant="ghost" size="sm" className="shrink-0" disabled={i === 0} onClick={() => patch({ signs: moveItem(layout.signs, i, -1) })}>
                  上
                </Button>
                <Button type="button" variant="ghost" size="sm" className="shrink-0" disabled={i === layout.signs.length - 1} onClick={() => patch({ signs: moveItem(layout.signs, i, 1) })}>
                  下
                </Button>
                <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => patch({ signs: layout.signs.filter((_, idx) => idx !== i) })}>
                  删
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => patch({ signs: [...layout.signs, { label: "签收" }] })}>
              加签字栏
            </Button>
          </section>

          {bizType === "contract" ? (
            <section className="rounded-lg border p-4 space-y-3">
              <h3 className="text-sm font-medium">合同</h3>
              <Field>
                <FieldLabel>甲方称呼</FieldLabel>
                <Input value={layout.partyALabel} onChange={(e) => patch({ partyALabel: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>乙方称呼</FieldLabel>
                <Input value={layout.partyBLabel} onChange={(e) => patch({ partyBLabel: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>开头说明</FieldLabel>
                <Textarea rows={3} value={layout.intro} onChange={(e) => patch({ intro: e.target.value })} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={layout.showSchedules} onCheckedChange={(v) => patch({ showSchedules: !!v })} />
                打印付款计划表
              </label>
              <p className="text-sm font-medium">合同条款</p>
              {layout.clauses.map((c, i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <Input value={c.title} onChange={(e) => patch({ clauses: layout.clauses.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)) })} />
                  <Textarea rows={4} value={c.body} onChange={(e) => patch({ clauses: layout.clauses.map((x, idx) => (idx === i ? { ...x, body: e.target.value } : x)) })} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => patch({ clauses: layout.clauses.filter((_, idx) => idx !== i) })}>
                    删除本条
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => patch({ clauses: [...layout.clauses, { title: "补充条款", body: "" }] })}>
                加一条
              </Button>
            </section>
          ) : null}

          <section className="rounded-lg border p-4 space-y-3">
            <Field>
              <FieldLabel>页脚说明</FieldLabel>
              <Textarea rows={2} value={layout.footerNote} onChange={(e) => patch({ footerNote: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>内部备注</FieldLabel>
              <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="不印在纸上" />
            </Field>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="submit">保存</Button>
            <Button type="button" variant="outline" onClick={() => router.push("/report-formats")}>
              返回
            </Button>
            <Button type="button" variant="ghost" onClick={() => setLayout(defaultLayout(bizType))}>
              恢复该业务常用版式
            </Button>
          </div>
        </div>

        <div className="min-w-0 xl:sticky xl:top-4">
          <p className="mb-2 text-sm font-medium">预览（示例数据，改列宽会马上变）</p>
          <div className="max-h-[calc(100vh-6rem)] overflow-auto rounded-xl border bg-white p-3 text-black">
            <div dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </div>
      </div>
    </form>
  );
}

function moveItem<T>(arr: T[], i: number, dir: -1 | 1) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  const a = next[i]!;
  const b = next[j]!;
  next[i] = b;
  next[j] = a;
  return next;
}

function setWidth(items: LayoutItem[], i: number, n: number) {
  const w = Math.min(99, Math.max(1, Math.round(n)));
  return items.map((x, idx) => (idx === i ? { ...x, width: w } : x));
}

function LayoutItemsEditor({
  items,
  onChange,
  kind,
}: {
  items: LayoutItem[];
  onChange: (next: LayoutItem[]) => void;
  kind: "meta" | "col";
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-10 pb-2 font-normal">印</th>
            <th className="pb-2 font-normal">显示名</th>
            {kind === "col" ? (
              <>
                <th className="w-40 pb-2 font-normal">列宽</th>
                <th className="w-14 pb-2 font-normal">占比</th>
              </>
            ) : null}
            <th className="w-24 pb-2 font-normal" />
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.key} className="border-t">
              <td className="py-2 align-middle">
                <Checkbox checked={it.show} onCheckedChange={(v) => onChange(items.map((x, idx) => (idx === i ? { ...x, show: !!v } : x)))} />
              </td>
              <td className="py-2 pr-2 align-middle">
                <Input className="h-8 min-w-0" value={it.label} onChange={(e) => onChange(items.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))} />
                <span className="mt-0.5 block text-[10px] text-muted-foreground">{it.key}</span>
              </td>
              {kind === "col" ? (
                <>
              <td className="py-2 pr-2 align-middle">
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="sm" className="h-8 w-8 shrink-0 px-0" onClick={() => onChange(setWidth(items, i, (it.width ?? 10) - 5))}>
                    −
                  </Button>
                  <Input
                    className="h-8 !w-14 shrink-0 px-1 text-center"
                    type="number"
                    min={1}
                    max={99}
                    title="相对列宽，数字越大该列越宽"
                    value={it.width ?? 10}
                    onChange={(e) => onChange(setWidth(items, i, Number(e.target.value) || 1))}
                  />
                  <Button type="button" variant="outline" size="sm" className="h-8 w-8 shrink-0 px-0" onClick={() => onChange(setWidth(items, i, (it.width ?? 10) + 5))}>
                    +
                  </Button>
                </div>
              </td>
              <td className="py-2 align-middle tabular-nums text-muted-foreground">{it.show ? `${sharePct(items, i)}%` : "—"}</td>
                </>
              ) : null}
              <td className="py-2 align-middle">
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" disabled={i === 0} onClick={() => onChange(moveItem(items, i, -1))}>
                    上
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={i === items.length - 1} onClick={() => onChange(moveItem(items, i, 1))}>
                    下
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
