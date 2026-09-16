"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveProduct } from "@/actions/master";
import { DeleteShopProduct } from "@/components/delete-shop-product";
import { ProductImageField } from "@/components/product-image-field";
import { CameraScanButton } from "@/components/camera-scan-button";
import { PRODUCT_UNITS } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export type CategoryOpt = {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  defaultTrackSerial?: boolean;
};

export type ProductFormValue = {
  id: string;
  code: string;
  name: string;
  brand: string;
  spec: string;
  unit: string;
  barcode: string;
  categoryId: string | null;
  isStocked: boolean;
  trackSerial: boolean;
  commonSn: string;
  canBeBuildPart: boolean;
  salePrice: string;
  lastCost: string;
  saleWarrantyMonths: number;
  purchaseWarrantyMonths: number;
  lowStock: string;
  remark: string;
  imageUrl: string;
  enabled: boolean;
};

const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProductForm({
  categories,
  brands = [],
  product,
  fromCatalog,
  showCost = true,
  afterSaveHref = "/products",
  enableScan = false,
  compact = false,
}: {
  categories: CategoryOpt[];
  brands?: string[];
  product?: ProductFormValue;
  fromCatalog?: boolean;
  showCost?: boolean;
  afterSaveHref?: string;
  enableScan?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState(product?.code ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [spec, setSpec] = useState(product?.spec ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "件");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [isStocked, setStocked] = useState(product?.isStocked ?? true);
  const [trackSerial, setTrack] = useState(product?.trackSerial ?? false);
  const [commonSn, setCommonSn] = useState(product?.commonSn ?? "");
  const [canBeBuildPart, setBuildPart] = useState(product?.canBeBuildPart ?? true);
  const [salePrice, setPrice] = useState(product?.salePrice ?? "0");
  const [lastCost, setCost] = useState(product?.lastCost ?? "0");
  const [saleWarrantyMonths, setSaleW] = useState(String(product?.saleWarrantyMonths ?? 12));
  const [purchaseWarrantyMonths, setPurW] = useState(String(product?.purchaseWarrantyMonths ?? 12));
  const [lowStock, setLow] = useState(product?.lowStock ?? "0");
  const [remark, setRemark] = useState(product?.remark ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [enabled, setEnabled] = useState(product?.enabled ?? true);
  const [showMore, setShowMore] = useState(!compact);

  const groups = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId);
    return roots.map((root) => ({
      root,
      children: categories.filter((c) => c.parentId === root.id),
    }));
  }, [categories]);

  const units = (PRODUCT_UNITS as readonly string[]).includes(unit) ? PRODUCT_UNITS : [unit, ...PRODUCT_UNITS];
  const inp = compact ? "h-12 text-base" : undefined;
  const sel = compact
    ? "h-12 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    : selectClass;

  return (
    <form
      className={compact ? "flex flex-col gap-4" : "flex max-w-3xl flex-col gap-4"}
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveProduct({
          id: product?.id,
          code,
          name,
          brand,
          spec,
          unit,
          barcode,
          categoryId,
          isStocked,
          trackSerial: isStocked && trackSerial,
          commonSn,
          canBeBuildPart: isStocked && canBeBuildPart,
          salePrice,
          lastCost: showCost ? lastCost : undefined,
          saleWarrantyMonths,
          purchaseWarrantyMonths,
          lowStock,
          remark,
          imageUrl,
          enabled,
        });
        if (r.ok) {
          toast.success("已保存商品资料");
          router.push(afterSaveHref);
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
        {compact && !showMore ? null : (
        <Field>
          <FieldLabel>商品编码</FieldLabel>
          <Input className={inp} value={code} onChange={(e) => setCode(e.target.value)} placeholder="可空，空则自动编号" />
        </Field>
        )}
        <Field>
          <FieldLabel>商品名称</FieldLabel>
          <Input className={inp} value={name} onChange={(e) => setName(e.target.value)} required placeholder="如 金士顿内存" />
        </Field>
        <Field>
          <FieldLabel>品牌</FieldLabel>
          <Input className={inp} list="product-brand-list" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="选已有或直接输入" />
          <datalist id="product-brand-list">
            {brands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
        <Field>
          <FieldLabel>型号规格</FieldLabel>
          <Input className={inp} value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="如 DDR4 16G 3200 / 1T 7200转" />
        </Field>
        <Field>
          <FieldLabel>单位</FieldLabel>
          <select className={sel} value={unit} onChange={(e) => setUnit(e.target.value)}>
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
            className={sel}
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
          <FieldLabel>商品条码</FieldLabel>
          {enableScan ? (
            <div className="flex items-stretch gap-2">
              <Input
                className={compact ? "h-12 min-w-0 flex-1 text-base" : "h-11 min-w-0 flex-1"}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="包装条码，可扫可手输"
              />
              <CameraScanButton
                compact
                onScan={(text) => {
                  setBarcode(text.trim());
                  toast.success("已填入商品条码");
                }}
              />
            </div>
          ) : (
            <Input className={inp} value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="包装条码，可扫" />
          )}
        </Field>
        <Field>
          <FieldLabel>销售单价</FieldLabel>
          <Input className={inp} inputMode="decimal" value={salePrice} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        {showCost ? (
        <Field>
          <FieldLabel>进价</FieldLabel>
          <Input className={inp} inputMode="decimal" value={lastCost} onChange={(e) => setCost(e.target.value)} />
        </Field>
        ) : null}
        <Field className="sm:col-span-2">
          <ProductImageField value={imageUrl} onChange={setImageUrl} />
        </Field>
        {compact ? (
          <button type="button" className="sm:col-span-2 self-start text-sm text-muted-foreground" onClick={() => setShowMore((v) => !v)}>
            {showMore ? "收起编码、条码、保修等" : "还要填编码、条码、保修、预警"}
          </button>
        ) : null}
        {showMore ? (
          <>
        <Field>
          <FieldLabel>通用 SN</FieldLabel>
          {enableScan ? (
            <div className="flex items-stretch gap-2">
              <Input
                className={compact ? "h-12 min-w-0 flex-1 text-base" : "h-11 min-w-0 flex-1"}
                value={commonSn}
                onChange={(e) => setCommonSn(e.target.value)}
                placeholder="同款共用，扫此码只识别这一款"
                disabled={!isStocked}
              />
              {isStocked ? (
                <CameraScanButton
                  compact
                  onScan={(text) => {
                    setCommonSn(text.trim());
                    toast.success("已填入通用 SN");
                  }}
                />
              ) : null}
            </div>
          ) : (
            <Input
              className={inp}
              value={commonSn}
              onChange={(e) => setCommonSn(e.target.value)}
              placeholder="同款共用，扫此码只识别这一款"
              disabled={!isStocked}
            />
          )}
        </Field>
        <Field>
          <FieldLabel>销售保修（月）</FieldLabel>
          <Input className={inp} inputMode="numeric" value={saleWarrantyMonths} onChange={(e) => setSaleW(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>进货保修（月）</FieldLabel>
          <Input className={inp} inputMode="numeric" value={purchaseWarrantyMonths} onChange={(e) => setPurW(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>库存预警</FieldLabel>
          <Input className={inp} value={lowStock} onChange={(e) => setLow(e.target.value)} disabled={!isStocked} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>备注</FieldLabel>
          <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="兼容主板、质保说明等" />
        </Field>
          </>
        ) : null}
        </div>
      </FieldGroup>
      <div className="flex flex-col gap-3 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <Checkbox checked={isStocked} onCheckedChange={(v) => setStocked(!!v)} />
          实物（走门店仓）
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <Checkbox checked={trackSerial} disabled={!isStocked} onCheckedChange={(v) => setTrack(!!v)} />
          管唯一 SN（一台一码）
        </label>
        {showMore ? (
          <>
        <label className="flex min-h-11 items-center gap-2">
          <Checkbox checked={canBeBuildPart} disabled={!isStocked} onCheckedChange={(v) => setBuildPart(!!v)} />
          可作组装配置配件
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(!!v)} />
          启用（停用后开单不再列出）
        </label>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" className={compact ? "h-12 w-full text-base" : undefined} size={compact ? "lg" : "default"}>
          {product ? "保存资料" : "保存商品资料"}
        </Button>
        {product ? <DeleteShopProduct id={product.id} name={product.name} afterHref={afterSaveHref} /> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {fromCatalog
          ? "这一款对照了产品目录，但改售价、名称、停用、删除都只动本店商品，目录图文规格不会变。"
          : "在这里添加、修改、删除只影响本店开单用的资料，不会改产品目录。"}
      </p>
    </form>
  );
}
