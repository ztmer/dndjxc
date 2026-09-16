"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCatalogSku } from "@/actions/catalog";
import { PRODUCT_UNITS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { CategoryOpt } from "@/components/forms/product-form";
import { ProductImageField } from "@/components/product-image-field";

export type CatalogFormValue = {
  id: string;
  code: string;
  name: string;
  brand: string;
  spec: string;
  params: string;
  unit: string;
  categoryId: string | null;
  imageUrl: string;
  remark: string;
  suggestedSale: string;
  suggestedCost: string;
  defaultWarrantyMonths: number;
  defaultIsStocked: boolean;
  defaultTrackSerial: boolean;
  defaultCanBeBuildPart: boolean;
};

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CatalogForm({
  categories,
  sku,
}: {
  categories: CategoryOpt[];
  sku?: CatalogFormValue;
}) {
  const router = useRouter();
  const [code, setCode] = useState(sku?.code ?? "");
  const [name, setName] = useState(sku?.name ?? "");
  const [brand, setBrand] = useState(sku?.brand ?? "");
  const [spec, setSpec] = useState(sku?.spec ?? "");
  const [params, setParams] = useState(sku?.params ?? "");
  const [unit, setUnit] = useState(sku?.unit ?? "件");
  const [categoryId, setCategoryId] = useState(sku?.categoryId ?? "");
  const [imageUrl, setImageUrl] = useState(sku?.imageUrl ?? "");
  const [remark, setRemark] = useState(sku?.remark ?? "");
  const [suggestedSale, setSale] = useState(sku?.suggestedSale ?? "0");
  const [suggestedCost, setCost] = useState(sku?.suggestedCost ?? "0");
  const [warranty, setWarranty] = useState(String(sku?.defaultWarrantyMonths ?? 12));
  const [isStocked, setStocked] = useState(sku?.defaultIsStocked ?? true);
  const [trackSerial, setTrack] = useState(sku?.defaultTrackSerial ?? false);
  const [canBeBuildPart, setBuildPart] = useState(sku?.defaultCanBeBuildPart ?? true);

  const groups = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId);
    return roots.map((root) => ({
      root,
      children: categories.filter((c) => c.parentId === root.id),
    }));
  }, [categories]);

  const units = (PRODUCT_UNITS as readonly string[]).includes(unit) ? PRODUCT_UNITS : [unit, ...PRODUCT_UNITS];

  return (
    <form
      className="flex max-w-3xl flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveCatalogSku({
          id: sku?.id,
          code,
          name,
          brand,
          spec,
          params,
          unit,
          categoryId,
          imageUrl,
          remark,
          suggestedSale,
          suggestedCost,
          defaultWarrantyMonths: warranty,
          defaultIsStocked: isStocked,
          defaultTrackSerial: isStocked && trackSerial,
          defaultCanBeBuildPart: isStocked && canBeBuildPart,
        });
        if (r.ok) {
          toast.success("已保存产品目录");
          router.push(`/catalog/${r.id}`);
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>目录编码</FieldLabel>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="可空，空则自动编号" />
          </Field>
          <Field>
            <FieldLabel>名称</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="如 酷睿 i5-14400F 盒装" />
          </Field>
          <Field>
            <FieldLabel>品牌</FieldLabel>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>型号规格</FieldLabel>
            <Input value={spec} onChange={(e) => setSpec(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>单位</FieldLabel>
            <select className={selectClass} value={unit} onChange={(e) => setUnit(e.target.value)}>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel>分类</FieldLabel>
            <select
              className={selectClass}
              value={categoryId}
              onChange={(e) => {
                const id = e.target.value;
                setCategoryId(id);
                const cat = categories.find((c) => c.id === id);
                if (isStocked) setTrack(!!cat?.defaultTrackSerial);
              }}
              required
            >
              <option value="">请选择</option>
              {groups.map((g) => (
                <optgroup key={g.root.id} label={g.root.name}>
                  <option value={g.root.id}>{g.root.name}（主类）</option>
                  {g.children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel>参考零售价</FieldLabel>
            <Input value={suggestedSale} onChange={(e) => setSale(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>参考进价</FieldLabel>
            <Input value={suggestedCost} onChange={(e) => setCost(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>参考保修（月）</FieldLabel>
            <Input value={warranty} onChange={(e) => setWarranty(e.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <ProductImageField value={imageUrl} onChange={setImageUrl} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>详细参数</FieldLabel>
            <Textarea value={params} onChange={(e) => setParams(e.target.value)} rows={6} placeholder="接口、核心、功耗、附带风扇等" />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>备注</FieldLabel>
            <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} />
          </Field>
        </div>
      </FieldGroup>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <Checkbox checked={isStocked} onCheckedChange={(v) => setStocked(!!v)} />
          默认可进店库存（服务类不要勾）
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={trackSerial} disabled={!isStocked} onCheckedChange={(v) => setTrack(!!v)} />
          加入本店时默认管唯一 SN
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={canBeBuildPart} disabled={!isStocked} onCheckedChange={(v) => setBuildPart(!!v)} />
          默认可作组装配件
        </label>
      </div>
      <Button type="submit">{sku ? "保存目录" : "新建目录型号"}</Button>
    </form>
  );
}
