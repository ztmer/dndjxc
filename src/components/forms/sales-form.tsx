"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { serialQtyError } from "@/lib/serials";
import { formatAmount } from "@/lib/format-amount";
import { loadCustomerPrices, completeSales } from "@/actions/sales";
import { DocLineEditor, docLinesTotal, emptyDocLine, type DocLine } from "@/components/doc-line-editor";
import { CustomerPickField } from "@/components/customer-pick-field";
import { OpeningBooksFields } from "@/components/opening-books-fields";
import { useShopBiz } from "@/components/use-force-outbound-sn";
import { formatDate } from "@/lib/format";

export type ProductOpt = {
  id: string;
  name: string;
  /** 商品资料名称，不含编码/品牌 */
  itemName?: string;
  salePrice: string;
  isStocked: boolean;
  trackSerial?: boolean;
  unit?: string;
  lastCost?: string;
  stockQty?: string;
  code?: string;
  category?: string;
  categoryCode?: string;
  spec?: string;
  brand?: string;
  params?: string;
};
export type CustomerOpt = {
  id: string;
  name: string;
  settlement: string;
  phone?: string;
  isWalkIn?: boolean;
  priceMemory?: boolean;
  needInvoice?: boolean;
};

type Line = DocLine;

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

export function SalesForm({
  customers,
  products,
  defaultCustomerId,
  defaultSettlement,
  defaultRemark,
  defaultLaterDelivery,
  defaultTaxInclusive,
  defaultNeedInvoice,
  defaultInvoiceType,
  defaultLines,
  defaultBooksOnly,
  defaultBizDate,
  docId,
  save,
}: {
  customers: CustomerOpt[];
  products: ProductOpt[];
  defaultCustomerId?: string;
  defaultSettlement?: string;
  defaultRemark?: string;
  defaultLaterDelivery?: boolean;
  defaultTaxInclusive?: boolean;
  defaultNeedInvoice?: boolean;
  defaultInvoiceType?: string;
  defaultLines?: Line[];
  defaultBooksOnly?: boolean;
  defaultBizDate?: string;
  docId?: string;
  save: (input: {
    id?: string;
    customerId: string;
    settlement: string;
    remark?: string;
    laterDelivery?: boolean;
    taxInclusive?: boolean;
    needInvoice?: boolean;
    invoiceType?: string;
    booksOnly?: boolean;
    bizDate?: string;
    lines: Line[];
  }) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const initial = customers.find((c) => c.id === defaultCustomerId) ?? customers[0];
  const [customerId, setCustomerId] = useState(initial?.id ?? "");
  const [settlement, setSettlement] = useState(defaultSettlement ?? initial?.settlement ?? "cash");
  const [remark, setRemark] = useState(defaultRemark ?? "");
  const walkIn0 = !!initial?.isWalkIn;
  const [laterDelivery, setLaterDelivery] = useState(defaultLaterDelivery ?? !walkIn0);
  const [taxInclusive, setTaxInclusive] = useState(defaultTaxInclusive ?? true);
  const [needInvoice, setNeedInvoice] = useState(defaultNeedInvoice ?? (!walkIn0 && !!initial?.needInvoice));
  const [invoiceType, setInvoiceType] = useState(defaultInvoiceType || (!walkIn0 && initial?.needInvoice ? "plain" : ""));
  const [mem, setMem] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Line[]>(defaultLines?.length ? defaultLines : [emptyDocLine()]);
  const [payMethod, setPayMethod] = useState("wechat");
  const [busy, setBusy] = useState(false);
  const [booksOnly, setBooksOnly] = useState(!!defaultBooksOnly);
  const [bizDate, setBizDate] = useState(defaultBizDate || formatDate(new Date()));
  const { forceOutboundSn: forceSn, openingMode } = useShopBiz();
  const customer = customers.find((c) => c.id === customerId);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!customerId || !customer?.priceMemory) {
        setMem({});
        return;
      }
      const next = await loadCustomerPrices(customerId);
      if (cancelled) return;
      setMem(next);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [customerId, customer?.priceMemory]);

  const filled = lines.filter((l) => l.productId);
  const material = filled.reduce((s, l) => {
    const p = products.find((x) => x.id === l.productId);
    return p?.isStocked ? s + Number(l.qty) * Number(l.price) : s;
  }, 0);
  const service = filled.reduce((s, l) => {
    const p = products.find((x) => x.id === l.productId);
    return p && !p.isStocked ? s + Number(l.qty) * Number(l.price) : s;
  }, 0);
  const total = useMemo(() => docLinesTotal(lines), [lines]);

  function addHint(hint: string) {
    const p = products.find((x) => x.name.includes(hint));
    if (!p) {
      toast.error(`资料里没有「${hint}」，请先在商品里建一条`);
      return;
    }
    const emptyIdx = lines.findIndex((l) => !l.productId);
    const row: Line = { productId: p.id, qty: "1", price: mem[p.id] || p.salePrice || "0", serials: "" };
    if (emptyIdx >= 0) setLines((prev) => prev.map((l, i) => (i === emptyIdx ? row : l)));
    else setLines((prev) => [...prev, row]);
  }

  async function persist(confirm: boolean) {
    if (!customerId) {
      toast.error("请先筛选并选中客户");
      return;
    }
    const shortOnStock = lines.some((l) => {
      const p = products.find((x) => x.id === l.productId);
      if (!p?.isStocked) return false;
      return Number(l.qty) > Number(p.stockQty || 0);
    });
    const deferSn = booksOnly || !forceSn || !confirm || (!customer?.isWalkIn && shortOnStock);
    const err = booksOnly ? null : serialQtyError(products, lines, { deferSerial: deferSn, optionalSerial: !forceSn });
    if (err) {
      toast.error(err);
      return;
    }
    const payload = {
      id: docId,
      customerId,
      settlement,
      remark,
      laterDelivery: booksOnly || customer?.isWalkIn ? false : laterDelivery,
      taxInclusive,
      needInvoice: customer?.isWalkIn ? false : needInvoice,
      invoiceType: customer?.isWalkIn || !needInvoice ? "" : invoiceType || "plain",
      booksOnly,
      bizDate: booksOnly ? bizDate : undefined,
      lines,
    };
    setBusy(true);
    try {
      const r = confirm
        ? await completeSales({ ...payload, payMethod, collect: booksOnly ? false : settlement === "cash" })
        : await save(payload);
      if (r.ok) {
        toast.success(
          confirm ? (booksOnly ? "已记入未收" : settlement === "cash" ? "已成交并收款" : "已开单出库") : "已暂存",
        );
        router.push(`/sales/${r.id}`);
        router.refresh();
      } else toast.error(r.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void persist(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field>
          <FieldLabel>客户</FieldLabel>
          <CustomerPickField
            customers={customers}
            value={customerId}
            onChange={(id, c) => {
              setCustomerId(id);
              if (!c) return;
              setSettlement(c.settlement);
              if (c.isWalkIn) {
                setLaterDelivery(false);
                setNeedInvoice(false);
                setInvoiceType("");
              } else {
                setLaterDelivery(true);
                setNeedInvoice(!!c.needInvoice);
                setInvoiceType(c.needInvoice ? "plain" : "");
              }
            }}
          />
          {customer?.isWalkIn ? (
            <p className="text-xs text-muted-foreground">散客：柜台现货，点成交就出库收款。缺货不能开、也不能转待采购。</p>
          ) : (
            <p className="text-xs text-muted-foreground">单位/老客：报价可暂存；谈妥点开单。没货出待采购，货到再开单送货。</p>
          )}
          {customer?.priceMemory ? <p className="text-xs text-muted-foreground">已启用价格记忆：选商品带出上次成交价</p> : null}
        </Field>
        <Field>
          <FieldLabel>结算周期</FieldLabel>
          <select className={sel} value={settlement} onChange={(e) => setSettlement(e.target.value)} disabled={customer?.isWalkIn}>
            <option value="cash">现金（当场收）</option>
            <option value="monthly">月结（进对账单）</option>
            <option value="yearly">年结（进对账单）</option>
          </select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>备注</FieldLabel>
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={customer?.isWalkIn ? "柜台备注" : "送货地址、约定等"} />
        </Field>
      </div>
      <OpeningBooksFields
        openingMode={openingMode}
        booksOnly={booksOnly}
        onBooksOnly={setBooksOnly}
        bizDate={bizDate}
        onBizDate={setBizDate}
      />
      {customer?.isWalkIn || booksOnly ? null : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>含税 / 带票</FieldLabel>
            <div className="flex flex-col gap-2 rounded-lg border px-3 py-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={taxInclusive} onCheckedChange={(v) => setTaxInclusive(!!v)} />
                金额含税
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={needInvoice}
                  onCheckedChange={(v) => {
                    const on = !!v;
                    setNeedInvoice(on);
                    setInvoiceType(on ? invoiceType || "plain" : "");
                  }}
                />
                本单要开票（只记约定，不做报税）
              </label>
              {needInvoice ? (
                <select className={sel} value={invoiceType || "plain"} onChange={(e) => setInvoiceType(e.target.value)}>
                  <option value="plain">增值税普通发票</option>
                  <option value="special">增值税专用发票</option>
                </select>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {needInvoice ? "开票资料用客户档案里的抬头、税号。" : "不带票。要票请勾上并选普票/专票。"}
              </p>
            </div>
          </Field>
          <label className="flex items-start gap-2 self-center text-sm">
            <Checkbox checked={laterDelivery} onCheckedChange={(v) => setLaterDelivery(!!v)} />
            <span>
              先开单后送货
              <span className="mt-0.5 block text-xs text-muted-foreground">缺货开单不用先扫码。店里有货出库前必须扫齐。</span>
            </span>
          </label>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">销售明细</div>
            <p className="text-xs text-muted-foreground">
              {booksOnly
                ? "期初旧单：只记金额到未收，不扣库存、不扫串号。货品按当时卖过的名称选即可。"
                : customer?.isWalkIn
                  ? "只卖门店现货。库存不够的行会标红，成交会被拦住。"
                  : "库存不够时开单会出待采购（缺货不用先扫 SN）。货到入库后再回本单扫码出库。"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addHint("上门")}>
              加上门费
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addHint("工时")}>
              加工时
            </Button>
          </div>
        </div>
        <DocLineEditor
          products={products}
          lines={lines}
          onChange={setLines}
          filterProducts
          rememberedPrices={customer?.priceMemory ? mem : undefined}
          deferSerial={booksOnly || laterDelivery}
          walkIn={!!customer?.isWalkIn}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
        <div className="grid gap-1 text-sm">
          <div className="flex gap-6">
            <span className="text-muted-foreground">材料 {formatAmount(material)}</span>
            <span className="text-muted-foreground">服务 {formatAmount(service)}</span>
          </div>
          <div className="text-lg font-semibold tabular-nums">合计 ¥{formatAmount(total)}</div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {settlement === "cash" && !booksOnly ? (
            <Field className="w-36">
              <FieldLabel>收款方式</FieldLabel>
              <select className={sel} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} disabled={busy}>
                <option value="wechat">微信</option>
                <option value="alipay">支付宝</option>
                <option value="cash">现金</option>
                <option value="transfer">转账</option>
              </select>
            </Field>
          ) : null}
          <Button type="button" variant="outline" size="lg" disabled={busy} onClick={() => void persist(false)}>
            暂存
          </Button>
          <Button type="submit" size="lg" disabled={busy}>
            {booksOnly ? "记入未收" : customer?.isWalkIn || settlement === "cash" ? "成交收款" : "开单出库"}
          </Button>
        </div>
      </div>
    </form>
  );
}
