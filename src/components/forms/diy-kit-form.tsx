"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteDiyKit, saveDiyKit } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BUILD_SLOTS, DIY_SCENES } from "@/lib/build-presets";
import type { ShopDiyKit } from "@/lib/diy-kit-types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductOpt } from "@/components/forms/sales-form";
import { SlotProductSelect } from "@/components/slot-product-select";

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

const emptyParts = () => BUILD_SLOTS.map((slot) => ({ slot, code: "", qty: "1" }));

export function DiyKitManager({ kits, products }: { kits: ShopDiyKit[]; products: ProductOpt[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const current = editing && editing !== "new" ? kits.find((k) => k.id === editing) : undefined;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [scene, setScene] = useState<string>(DIY_SCENES[0]);
  const [hint, setHint] = useState("");
  const [laborFee, setLaborFee] = useState("150");
  const [sale, setSale] = useState("");
  const [cpu, setCpu] = useState("");
  const [gpu, setGpu] = useState("");
  const [mb, setMb] = useState("");
  const [ram, setRam] = useState("");
  const [remark, setRemark] = useState("");
  const [parts, setParts] = useState(emptyParts());

  function startNew() {
    setEditing("new");
    setCode("");
    setName("");
    setScene(DIY_SCENES[0]);
    setHint("");
    setLaborFee("150");
    setSale("");
    setCpu("");
    setGpu("");
    setMb("");
    setRam("");
    setRemark("");
    setParts(emptyParts());
  }

  function startEdit(k: ShopDiyKit) {
    setEditing(k.id);
    setCode(k.code);
    setName(k.name);
    setScene(k.scene);
    setHint(k.hint);
    setLaborFee(k.laborFee);
    setSale(String(k.sale || ""));
    setCpu(k.cpu);
    setGpu(k.gpu);
    setMb(k.mb);
    setRam(k.ram);
    setRemark(k.remark);
    const map = new Map(k.parts.map((p) => [p.slot, p]));
    setParts(BUILD_SLOTS.map((slot) => ({ slot, code: map.get(slot)?.code ?? "", qty: map.get(slot)?.qty ?? "1" })));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={startNew}>
          新增套餐
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>编码</TableHead>
            <TableHead>名称</TableHead>
            <TableHead>场景</TableHead>
            <TableHead>CPU / 显卡</TableHead>
            <TableHead className="w-36" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {kits.map((k) => (
            <TableRow key={k.id}>
              <TableCell className="font-mono text-xs">{k.code}</TableCell>
              <TableCell>{k.name}</TableCell>
              <TableCell>{k.scene}</TableCell>
              <TableCell className="text-muted-foreground">
                {k.cpu} · {k.gpu}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => startEdit(k)}>
                    修改
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!confirm(`删除套餐「${k.name}」？新建配置里将不再出现。`)) return;
                      const r = await deleteDiyKit(k.id);
                      if (r.ok) {
                        toast.success("已删除");
                        if (editing === k.id) setEditing(null);
                        router.refresh();
                      } else toast.error(r.error);
                    }}
                  >
                    删除
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing ? (
        <form
          className="flex flex-col gap-4 rounded-lg border p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await saveDiyKit({
              id: editing === "new" ? undefined : editing,
              code,
              name,
              scene,
              hint,
              laborFee,
              sale,
              cpu,
              gpu,
              mb,
              ram,
              remark,
              parts,
            });
            if (r.ok) {
              toast.success("套餐已保存，新建配置里可带入");
              setEditing(null);
              router.refresh();
            } else toast.error(r.error);
          }}
        >
          <p className="text-sm font-medium">{editing === "new" ? "新增套餐" : "修改套餐"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>编码</FieldLabel>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KIT-OFFICE" required />
            </Field>
            <Field>
              <FieldLabel>名称</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <Field>
              <FieldLabel>场景</FieldLabel>
              <select className={sel} value={scene} onChange={(e) => setScene(e.target.value)}>
                {DIY_SCENES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel>工时费</FieldLabel>
              <Input value={laborFee} onChange={(e) => setLaborFee(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>参考售价</FieldLabel>
              <Input value={sale} onChange={(e) => setSale(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>简介</FieldLabel>
              <Input value={hint} onChange={(e) => setHint(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>CPU 展示</FieldLabel>
              <Input value={cpu} onChange={(e) => setCpu(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>显卡展示</FieldLabel>
              <Input value={gpu} onChange={(e) => setGpu(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>主板展示</FieldLabel>
              <Input value={mb} onChange={(e) => setMb(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>内存展示</FieldLabel>
              <Input value={ram} onChange={(e) => setRam(e.target.value)} />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel>备注</FieldLabel>
              <Input value={remark} onChange={(e) => setRemark(e.target.value)} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">配件（本店商品，按配件位分类筛选）</p>
            <p className="mb-2 text-xs text-muted-foreground">点开搜索，只出这一类。没有的货先在本店商品里建。</p>
            <div className="grid gap-2">
              {parts.map((p, i) => {
                const picked = products.find((x) => (x.code || "").toUpperCase() === p.code.trim().toUpperCase());
                return (
                  <div key={p.slot} className="grid grid-cols-[7rem_1fr_5rem] items-start gap-2">
                    <span className="mt-1.5 text-sm text-muted-foreground">{p.slot}</span>
                    <div>
                    <SlotProductSelect
                      products={products}
                      value={picked?.id ?? ""}
                      slot={p.slot}
                      showMeta
                      onPick={(id) => {
                        const prod = products.find((x) => x.id === id);
                        setParts((rows) =>
                          rows.map((r, j) => (j === i ? { ...r, code: prod?.code ?? "" } : r)),
                        );
                        if (!prod) return;
                        const show = [prod.brand, prod.itemName || prod.name].filter(Boolean).join(" ").trim();
                        if (p.slot === "CPU") setCpu(show);
                        if (p.slot === "显卡") setGpu(show);
                        if (p.slot === "主板") setMb(show);
                        if (p.slot === "内存") setRam(show);
                      }}
                    />
                    {p.code && !picked ? (
                      <p className="mt-1 text-xs text-destructive">本店没有编码 {p.code}，请改选或先建商品</p>
                    ) : null}
                    </div>
                    <Input
                      value={p.qty}
                      onChange={(e) => setParts((rows) => rows.map((r, j) => (j === i ? { ...r, qty: e.target.value } : r)))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">保存套餐</Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              取消
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
