"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CustomerOpt, ProductOpt } from "@/components/forms/sales-form";
import { serialQtyError } from "@/lib/serials";
import { formatAmount } from "@/lib/format-amount";
import { formatDate } from "@/lib/format";
import { DocLineEditor, emptyDocLine, type DocLine } from "@/components/doc-line-editor";
import { ProcessNoteField } from "@/components/process-note-field";
import { saveWorkNoteToKnowledge } from "@/actions/knowledge";
import { submitWorkOrder } from "@/actions/service";
import { persistThenConfirm } from "@/lib/persist-then-confirm";
import { CustomerPickField } from "@/components/customer-pick-field";
import { OpeningBooksFields } from "@/components/opening-books-fields";
import { useShopBiz } from "@/components/use-force-outbound-sn";
import { VISIT_TYPE } from "@/lib/labels";

type Line = DocLine;
type Labor = { name: string; workDate: string; days: string; dayRate: string };

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

export function WorkOrderForm({
  customers,
  products,
  sites,
  projects,
  defaultCustomerId,
  defaultProjectId,
  warrantyMode,
  sourceSale,
  docId,
  initial,
  detailHref,
  save,
}: {
  customers: CustomerOpt[];
  products: ProductOpt[];
  sites: { id: string; name: string; customerId: string }[];
  projects: { id: string; name: string; customerId: string }[];
  defaultCustomerId?: string;
  defaultProjectId?: string;
  warrantyMode?: boolean;
  /** 从销售开售后：带出原单号和 SN，不把原商品再做出库行 */
  sourceSale?: { docNo: string; items: { name: string; serials: string[] }[] };
  docId?: string;
  initial?: {
    siteId?: string;
    projectId?: string;
    visitType?: string;
    appointedAt?: string;
    processNote?: string;
    nextAdvice?: string;
    settlement?: string;
    lines?: Line[];
    labors?: Labor[];
    booksOnly?: boolean;
    bizDate?: string;
  };
  /** 保存后跳转，`:id` 会换成工单 id */
  detailHref?: string;
  save: (input: {
    id?: string;
    customerId: string;
    siteId?: string;
    projectId?: string;
    visitType: string;
    appointedAt?: string;
    processNote?: string;
    nextAdvice?: string;
    settlement: string;
    booksOnly?: boolean;
    bizDate?: string;
    lines: Line[];
    labors: Labor[];
  }) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const { forceOutboundSn: forceSn, openingMode } = useShopBiz();
  const picked = customers.find((c) => c.id === defaultCustomerId);
  const [customerId, setCustomerId] = useState(picked?.id ?? "");
  const [siteId, setSiteId] = useState(initial?.siteId ?? "");
  const [projectId, setProjectId] = useState(initial?.projectId ?? defaultProjectId ?? "");
  const [visitType, setVisitType] = useState(initial?.visitType ?? "onsite");
  const [appointedAt, setAppointedAt] = useState(initial?.appointedAt ?? "");
  const [processNote, setProcessNote] = useState(
    initial?.processNote ??
      (sourceSale
        ? [
            `原销售 ${sourceSale.docNo}`,
            ...sourceSale.items.map((it) =>
              it.serials.length ? `${it.name}　SN ${it.serials.join("、")}` : it.name,
            ),
          ].join("\n")
        : ""),
  );
  const [kbCategoryId, setKbCategoryId] = useState("");
  const [nextAdvice, setNextAdvice] = useState(initial?.nextAdvice ?? "");
  const [settlement, setSettlement] = useState(initial?.settlement ?? picked?.settlement ?? "cash");
  const [booksOnly, setBooksOnly] = useState(!!initial?.booksOnly);
  const [bizDate, setBizDate] = useState(initial?.bizDate || formatDate(new Date()));
  const [lines, setLines] = useState<Line[]>(
    initial?.lines?.length ? initial.lines : [emptyDocLine()],
  );
  const today = formatDate(new Date());
  const [labors, setLabors] = useState<Labor[]>(initial?.labors?.length ? initial.labors : []);
  const [showMore, setShowMore] = useState(!!(initial?.siteId || initial?.projectId || defaultProjectId || initial?.appointedAt || initial?.nextAdvice));
  const [showLabor, setShowLabor] = useState(!!initial?.labors?.some((l) => l.name));
  const customer = customers.find((c) => c.id === customerId);
  const onProject = !!projectId;

  const material = lines.reduce((s, l) => {
    const p = products.find((x) => x.id === l.productId);
    return l.productId && p?.isStocked ? s + Number(l.qty) * Number(l.price) : s;
  }, 0);
  const service = lines.reduce((s, l) => {
    const p = products.find((x) => x.id === l.productId);
    return l.productId && p && !p.isStocked ? s + Number(l.qty) * Number(l.price) : s;
  }, 0);
  const billable = useMemo(
    () =>
      lines.reduce((s, l) => {
        if (!l.productId || l.isWarrantyFree) return s;
        const amt = Number(l.qty) * Number(l.price);
        if (onProject) return l.isContractExtra ? s + amt : s;
        return s + amt;
      }, 0),
    [lines, onProject],
  );
  const laborCost = labors.reduce((s, l) => (l.name ? s + (Number(l.days) || 0) * (Number(l.dayRate) || 0) : s), 0);

  function addHint(kind: "上门" | "工时" | "委外") {
    const prefer =
      kind === "工时" ? ["维修工时"] : kind === "委外" ? ["委外维修"] : ["上门费", "上门"];
    const p =
      prefer.map((n) => products.find((x) => x.itemName === n || x.name.includes(n))).find(Boolean) ??
      products.find((x) => x.name.includes(kind) && !x.name.includes("组装"));
    if (!p) {
      toast.error(kind === "工时" ? "资料里没有「维修工时」" : kind === "委外" ? "资料里没有「委外维修」" : "资料里没有「上门费」");
      return;
    }
    const emptyIdx = lines.findIndex((l) => !l.productId);
    // 上门/工时是服务费，保内也默认要收，不要跟材料一起勾免费
    const row: Line = { ...emptyDocLine(), productId: p.id, price: p.salePrice, isWarrantyFree: false };
    if (emptyIdx >= 0) setLines((prev) => prev.map((l, i) => (i === emptyIdx ? row : l)));
    else setLines((prev) => [...prev, row]);
  }

  async function persist(confirm: boolean, collect = false) {
    if (!customerId) {
      toast.error("请先筛选并选中客户");
      return;
    }
    const err = booksOnly ? null : serialQtyError(products, lines, { optionalSerial: !forceSn });
    if (err) {
      toast.error(err);
      return;
    }
    const r = await persistThenConfirm(
      () =>
        save({
          id: docId,
          customerId,
          siteId: siteId || undefined,
          projectId: projectId || undefined,
          visitType,
          appointedAt: appointedAt || undefined,
          processNote,
          nextAdvice,
          settlement: customer?.isWalkIn ? "cash" : settlement,
          booksOnly,
          bizDate: booksOnly ? bizDate : undefined,
          lines,
          labors,
        }),
      (id) => submitWorkOrder(id, { collect: booksOnly ? false : collect }),
      confirm,
    );
    if (r.ok) {
      toast.success(
        confirm
          ? booksOnly
            ? "已记入未收"
            : collect
              ? "已完工并收款"
              : "已完工，钱记在未收，以后收款"
          : "已暂存",
      );
      if (processNote.trim()) {
        const kb = await saveWorkNoteToKnowledge({ note: processNote, categoryId: kbCategoryId || undefined });
        if (kb.ok && !kb.existed) toast.message(`知识库没有这条，已存为「${kb.title}」`);
      }
      router.push((detailHref ?? "/work-orders/:id").replace(":id", r.id));
      router.refresh();
    } else toast.error(r.error);
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void persist(true, false);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel>客户</FieldLabel>
          <CustomerPickField
            customers={customers}
            value={customerId}
            onChange={(id, c) => {
              if (id !== customerId) {
                setSiteId("");
                setProjectId("");
              }
              setCustomerId(id);
              if (c) setSettlement(c.settlement);
            }}
          />
        </Field>
        <Field>
          <FieldLabel>类型</FieldLabel>
          <select className={sel} value={visitType} onChange={(e) => setVisitType(e.target.value)}>
            <option value="onsite">{VISIT_TYPE.onsite}</option>
            <option value="instore">{VISIT_TYPE.instore}</option>
            <option value="outsource">{VISIT_TYPE.outsource}</option>
          </select>
        </Field>
        <Field>
          <FieldLabel>结算</FieldLabel>
          <select className={sel} value={settlement} onChange={(e) => setSettlement(e.target.value)} disabled={customer?.isWalkIn}>
            <option value="cash">现金（可当场收，也可迟点收）</option>
            <option value="monthly">月结</option>
            <option value="yearly">年结</option>
          </select>
        </Field>
      </div>

      <OpeningBooksFields
        openingMode={openingMode}
        booksOnly={booksOnly}
        onBooksOnly={setBooksOnly}
        bizDate={bizDate}
        onBizDate={setBizDate}
      />

      {visitType === "outsource" ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm leading-relaxed">
          客户自己的配件送外厂：不要当本店货出库。过程里写厂商、外修单号、配件 SN。费用加「委外维修」或「维修工时」（非库存），金额进未收。店里自己的货外修才走其它出库。
        </p>
      ) : null}

      {sourceSale ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          原销售 <span className="font-medium">{sourceSale.docNo}</span>
          {sourceSale.items.length
            ? ` · ${sourceSale.items
                .map((it) => (it.serials.length ? `${it.name}（${it.serials.join("、")}）` : it.name))
                .join("；")}`
            : " · 该单没有串号"}
          。下面材料才出库；原卖出的货不用再扫一遍。
        </p>
      ) : null}

      <ProcessNoteField value={processNote} onChange={setProcessNote} categoryId={kbCategoryId} onCategoryIdChange={setKbCategoryId} />

      <button
        type="button"
        className="self-start text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setShowMore((v) => !v)}
      >
        {showMore ? "收起上门地点 / 工程 / 预约" : "上门地点、工程、预约、下次建议"}
      </button>
      {showMore ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field>
            <FieldLabel>上门地点</FieldLabel>
            <select className={sel} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">不指定</option>
              {sites
                .filter((s) => s.customerId === customerId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
            {customerId && sites.filter((s) => s.customerId === customerId).length === 0 ? (
              <p className="text-xs text-muted-foreground">这个客户还没有上门地点，到客户档案「编辑资料」里添加。</p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel>所属工程</FieldLabel>
            <select className={sel} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">零星工单</option>
              {projects
                .filter((p) => p.customerId === customerId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            {onProject ? (
              <p className="text-xs text-muted-foreground">
                {warrantyMode
                  ? "质保售后：换料默认保内免费。上门费、工时默认要收，不要勾保内。"
                  : "属工程：材料默认只作出库清单。只有勾「合同外增项」才向客户加钱。"}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel>预约时间</FieldLabel>
            <Input type="datetime-local" value={appointedAt} onChange={(e) => setAppointedAt(e.target.value)} />
          </Field>
          <Field className="sm:col-span-2 lg:col-span-3">
            <FieldLabel>下次建议</FieldLabel>
            <Input value={nextAdvice} onChange={(e) => setNextAdvice(e.target.value)} placeholder="如 一周后回访、建议换电源" />
          </Field>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">材料与费用</div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => addHint("委外")}>
              委外维修
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addHint("上门")}>
              上门费
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => addHint("工时")}>
              维修工时
            </Button>
          </div>
        </div>
        <DocLineEditor products={products} lines={lines} onChange={setLines} showWorkFlags filterProducts defaultWarrantyFree={warrantyMode} />
      </div>

      <div>
        <button
          type="button"
          className="text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            setShowLabor((v) => !v);
            if (!showLabor && labors.length === 0) {
              setLabors([{ name: "", workDate: today, days: "1", dayRate: "300" }]);
            }
          }}
        >
          {showLabor ? "收起临时工" : "记临时工（店内成本，不对客户出账）"}
        </button>
        {showLabor ? (
          <div className="mt-2 overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>姓名</TableHead>
                  <TableHead className="w-40">日期</TableHead>
                  <TableHead className="w-24">天数</TableHead>
                  <TableHead className="w-28">日薪</TableHead>
                  <TableHead className="w-28 text-right">金额</TableHead>
                  <TableHead className="w-14" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {labors.map((lb, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input value={lb.name} onChange={(e) => setLabors((p) => p.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))} placeholder="姓名" />
                    </TableCell>
                    <TableCell>
                      <Input type="date" value={lb.workDate} onChange={(e) => setLabors((p) => p.map((x, idx) => (idx === i ? { ...x, workDate: e.target.value } : x)))} />
                    </TableCell>
                    <TableCell>
                      <Input value={lb.days} onChange={(e) => setLabors((p) => p.map((x, idx) => (idx === i ? { ...x, days: e.target.value } : x)))} />
                    </TableCell>
                    <TableCell>
                      <Input value={lb.dayRate} onChange={(e) => setLabors((p) => p.map((x, idx) => (idx === i ? { ...x, dayRate: e.target.value } : x)))} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {lb.name ? formatAmount((Number(lb.days) || 0) * (Number(lb.dayRate) || 0)) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setLabors((p) => p.filter((_, idx) => idx !== i))}>
                        删
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t p-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setLabors((l) => [...l, { name: "", workDate: today, days: "1", dayRate: "300" }])}>
                加记工
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 z-20 -mx-6 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-6 py-3 backdrop-blur">
        <div className="text-sm">
          <span className="text-muted-foreground">材料 {formatAmount(material)}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="text-muted-foreground">服务 {formatAmount(service)}</span>
          {laborCost ? (
            <>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">临时工 {formatAmount(laborCost)}</span>
            </>
          ) : null}
          <span className="ml-3 text-base font-semibold tabular-nums">应收 ¥{formatAmount(billable)}</span>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <p className="text-xs text-muted-foreground sm:text-right">
            {booksOnly
              ? "期初旧单：完工后金额进未收，不扣库存。"
              : "今天没收到钱点「完工，迟点收款」；钱当场给了点「完工并收款」。"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-11 min-h-11 px-5" onClick={() => void persist(false)}>
              暂存
            </Button>
            <Button type="submit" variant="outline" className="h-11 min-h-11 px-5">
              {booksOnly ? "完工，记入未收" : "完工，迟点收款"}
            </Button>
            {booksOnly ? null : (
              <Button type="button" className="h-11 min-h-11 px-5" onClick={() => void persist(true, true)}>
                完工并收款
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
