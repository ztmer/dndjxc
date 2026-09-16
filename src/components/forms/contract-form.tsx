"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveContractDraft, saveProject, submitContract } from "@/actions/service";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CustomerOpt } from "@/components/forms/sales-form";
import { formatAmount } from "@/lib/format-amount";
import { Checkbox } from "@/components/ui/checkbox";
import { persistThenConfirm } from "@/lib/persist-then-confirm";
import { CustomerPickField } from "@/components/customer-pick-field";

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

type Schedule = { name: string; amount: string; dueDate: string };

export function ContractForm({
  customers,
  defaultCustomerId,
  docId,
  initial,
}: {
  customers: CustomerOpt[];
  defaultCustomerId?: string;
  docId?: string;
  initial?: {
    title: string;
    amount: string;
    warrantyMonths: string;
    settlement: string;
    durationNote: string;
    remark: string;
    signDate: string;
    taxInclusive?: boolean;
    needInvoice?: boolean;
    invoiceType?: string;
    schedules: Schedule[];
  };
}) {
  const router = useRouter();
  const picked = customers.find((c) => c.id === defaultCustomerId) ?? customers[0];
  const [customerId, setCustomerId] = useState(picked?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "监控安装");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [warrantyMonths, setWarrantyMonths] = useState(initial?.warrantyMonths ?? "12");
  const [settlement, setSettlement] = useState(initial?.settlement ?? picked?.settlement ?? "monthly");
  const [signDate, setSignDate] = useState(initial?.signDate ?? new Date().toISOString().slice(0, 10));
  const [durationNote, setDurationNote] = useState(initial?.durationNote ?? "");
  const [remark, setRemark] = useState(initial?.remark ?? "");
  const [taxInclusive, setTaxInclusive] = useState(initial?.taxInclusive ?? true);
  const [needInvoice, setNeedInvoice] = useState(initial?.needInvoice ?? !!picked?.needInvoice);
  const [invoiceType, setInvoiceType] = useState(initial?.invoiceType || (picked?.needInvoice ? "plain" : ""));
  const [schedules, setSchedules] = useState<Schedule[]>(
    initial?.schedules?.length
      ? initial.schedules
      : [
          { name: "订金", amount: "", dueDate: "" },
          { name: "进度款", amount: "", dueDate: "" },
          { name: "验收尾款", amount: "", dueDate: "" },
        ],
  );
  const customer = customers.find((c) => c.id === customerId);

  const schedTotal = useMemo(
    () => schedules.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [schedules],
  );
  const contractAmt = Number(amount) || 0;
  const schedDiff = Math.abs(schedTotal - contractAmt) > 0.009 && contractAmt > 0;

  function patchSched(i: number, next: Partial<Schedule>) {
    setSchedules((p) => p.map((x, idx) => (idx === i ? { ...x, ...next } : x)));
  }

  async function persist(confirm: boolean) {
    if (!title.trim() || !amount) {
      toast.error("请填写项目名称和合同金额");
      return;
    }
    const r = await persistThenConfirm(
      () =>
        saveContractDraft({
          id: docId,
          customerId,
          title,
          amount,
          warrantyMonths,
          settlement: customer?.isWalkIn ? "cash" : settlement,
          durationNote,
          taxInclusive,
          needInvoice,
          invoiceType: needInvoice ? invoiceType || "plain" : "",
          remark,
          signDate,
          schedules,
        }),
      submitContract,
      confirm,
    );
    if (r.ok) {
      toast.success(confirm ? "已下单" : "已暂存报价");
      router.push(`/contracts/${r.id}`);
      router.refresh();
    } else toast.error(r.error);
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void persist(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel>客户</FieldLabel>
          <CustomerPickField
            customers={customers}
            value={customerId}
            onChange={(id, c) => {
              setCustomerId(id);
              if (c) {
                setSettlement(c.settlement);
                setNeedInvoice(!!c.needInvoice);
                setInvoiceType(c.needInvoice ? invoiceType || "plain" : "");
              }
            }}
          />
        </Field>
        <Field>
          <FieldLabel>项目名称</FieldLabel>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如 门店监控安装 / 弱电改造" />
        </Field>
        <Field>
          <FieldLabel>合同金额</FieldLabel>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field>
          <FieldLabel>签订日期</FieldLabel>
          <Input type="date" value={signDate} onChange={(e) => setSignDate(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>质保（月）</FieldLabel>
          <Input value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>结算周期</FieldLabel>
          <select className={sel} value={settlement} onChange={(e) => setSettlement(e.target.value)} disabled={customer?.isWalkIn}>
            <option value="cash">现金</option>
            <option value="monthly">月结</option>
            <option value="yearly">年结</option>
          </select>
        </Field>
        <Field>
          <FieldLabel>工期说明</FieldLabel>
          <Input value={durationNote} onChange={(e) => setDurationNote(e.target.value)} placeholder="如 签订后 15 天完工" />
        </Field>
        <Field className="sm:col-span-2 lg:col-span-3">
          <FieldLabel>含税 / 带票</FieldLabel>
          <div className="flex flex-col gap-2 rounded-lg border px-3 py-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={taxInclusive} onCheckedChange={(v) => setTaxInclusive(!!v)} />
              合同额含税
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
              {needInvoice ? "开票资料用客户档案里的抬头、税号。" : "不带票。单位客户若要票，勾上并选普票/专票。"}
            </p>
          </div>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel>备注</FieldLabel>
          <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="点位数量、不含项、验收标准等" />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <div className="text-sm font-medium">收款计划</div>
          <p className="text-xs text-muted-foreground">
            报价可暂存；点「下单」合同额进应收。订金可马上收款。施工材料默认不再另计，只有勾了「合同外增项」才加钱。
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>款项</TableHead>
                <TableHead className="w-40">金额</TableHead>
                <TableHead className="w-44">预计日期</TableHead>
                <TableHead className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Input value={s.name} onChange={(e) => patchSched(i, { name: e.target.value })} placeholder="款项名称" />
                  </TableCell>
                  <TableCell>
                    <Input value={s.amount} onChange={(e) => patchSched(i, { amount: e.target.value })} placeholder="0.00" />
                  </TableCell>
                  <TableCell>
                    <Input type="date" value={s.dueDate} onChange={(e) => patchSched(i, { dueDate: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSchedules((p) => p.filter((_, idx) => idx !== i))}>
                      删
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t p-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSchedules((p) => [...p, { name: "", amount: "", dueDate: "" }])}
            >
              加一笔款项
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>计划合计 ¥{formatAmount(schedTotal)}</span>
          <span>合同额 ¥{formatAmount(contractAmt)}</span>
          {schedDiff ? <span className="text-destructive">计划合计与合同额不一致，请核对</span> : null}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" size="lg" onClick={() => void persist(false)}>
          暂存报价
        </Button>
        <Button type="submit" size="lg">
          下单
        </Button>
      </div>
    </form>
  );
}

export function ProjectForm({
  contracts,
  sites,
  defaultContractId,
}: {
  contracts: { id: string; label: string; customerId: string }[];
  sites: { id: string; name: string; customerId: string }[];
  defaultContractId?: string;
}) {
  const router = useRouter();
  const [contractId, setContractId] = useState(defaultContractId && contracts.some((c) => c.id === defaultContractId) ? defaultContractId : (contracts[0]?.id ?? ""));
  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState("");
  const [remark, setRemark] = useState("");
  const contract = contracts.find((c) => c.id === contractId);
  return (
    <form
      className="flex max-w-lg flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) {
          toast.error("请填工程名称");
          return;
        }
        const r = await saveProject({ contractId, name, siteId, remark });
        if (r.ok) {
          toast.success("已建工程，可以开工");
          router.push(`/projects/${r.id}`);
        } else toast.error(r.error);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>所属合同</FieldLabel>
          <select
            className={sel}
            value={contractId}
            onChange={(e) => {
              setContractId(e.target.value);
              setSiteId("");
            }}
          >
            {contracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel>工程名称</FieldLabel>
          <Input placeholder="如 一楼监控" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>点位</FieldLabel>
          <select className={sel} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">不指定</option>
            {sites
              .filter((s) => s.customerId === contract?.customerId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </Field>
        <Field>
          <FieldLabel>备注</FieldLabel>
          <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="覆盖范围、进场注意等" />
        </Field>
      </FieldGroup>
      <Button type="submit">新建工程</Button>
    </form>
  );
}
