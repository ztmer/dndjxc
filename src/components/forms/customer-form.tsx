"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCustomer, deleteCustomer, deleteCustomerSite } from "@/actions/master";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

export function CustomerForm({
  customer,
  afterSaveHref,
  compact,
}: {
  /** 保存后跳转，`:id` 会换成客户 id */
  afterSaveHref?: string;
  compact?: boolean;
  customer?: {
    id: string;
    code?: string;
    name: string;
    contactName: string;
    phone: string;
    address: string;
    isWalkIn: boolean;
    settlement: string;
    remark?: string;
    needInvoice: boolean;
    invoiceTitle: string;
    taxNo: string;
    invoiceBank: string;
    invoiceAccount: string;
    invoiceAddress: string;
    invoicePhone: string;
    priceMemory?: boolean;
    sites?: { id: string; name: string; address: string }[];
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(customer?.name ?? "");
  const [contactName, setContactName] = useState(customer?.contactName ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [isWalkIn, setWalkIn] = useState(customer?.isWalkIn ?? false);
  const [settlement, setSettlement] = useState(customer?.settlement ?? "cash");
  const [remark, setRemark] = useState(customer?.remark ?? "");
  const [priceMemory, setPriceMemory] = useState(customer?.isWalkIn ? false : (customer?.priceMemory ?? true));
  const [needInvoice, setNeedInvoice] = useState(customer?.needInvoice ?? false);
  const [invoiceTitle, setInvoiceTitle] = useState(customer?.invoiceTitle ?? "");
  const [taxNo, setTaxNo] = useState(customer?.taxNo ?? "");
  const [invoiceBank, setInvoiceBank] = useState(customer?.invoiceBank ?? "");
  const [invoiceAccount, setInvoiceAccount] = useState(customer?.invoiceAccount ?? "");
  const [invoiceAddress, setInvoiceAddress] = useState(customer?.invoiceAddress ?? "");
  const [invoicePhone, setInvoicePhone] = useState(customer?.invoicePhone ?? "");
  const [sites, setSites] = useState<{ id?: string; name: string; address: string }[]>(
    customer?.sites?.length ? customer.sites.map((s) => ({ id: s.id, name: s.name, address: s.address })) : [{ name: "", address: "" }],
  );

  function setSite(i: number, patch: Partial<{ name: string; address: string }>) {
    setSites((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveCustomer({
          id: customer?.id,
          name,
          contactName,
          phone,
          address,
          isWalkIn,
          settlement: compact || isWalkIn ? "cash" : settlement,
          remark,
          needInvoice: compact ? false : needInvoice,
          invoiceTitle,
          taxNo,
          invoiceBank,
          invoiceAccount,
          invoiceAddress,
          invoicePhone,
          priceMemory: isWalkIn ? false : priceMemory,
          sites: isWalkIn
            ? []
            : sites
                .filter((s) => s.name.trim())
                .map((s) => ({ id: s.id, name: s.name.trim(), address: s.address.trim() || address })),
        });
        if (r.ok) {
          toast.success("已保存");
          router.push((afterSaveHref ?? "/customers/:id").replace(":id", r.id));
        } else toast.error(r.error);
      }}
    >
      <FieldGroup>
        {compact ? (
          <>
            <Field>
              <FieldLabel>名称</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="单位或个人姓名" className="h-12 text-base" />
            </Field>
            <Field>
              <FieldLabel>电话</FieldLabel>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 text-base" />
            </Field>
            <Field>
              <FieldLabel>地址</FieldLabel>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-12 text-base" placeholder="可空" />
            </Field>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Checkbox
                checked={isWalkIn}
                onCheckedChange={(v) => {
                  const on = !!v;
                  setWalkIn(on);
                  if (on) setPriceMemory(false);
                }}
              />
              散客（不能月结/年结，默认不勾）
            </label>
            <p className="text-xs text-muted-foreground">手机只能建现金客户。月结/年结、多个上门地点请用电脑编辑。</p>
          </>
        ) : (
        <>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel>名称</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="单位或个人姓名" />
          </Field>
          <Field>
            <FieldLabel>联系人</FieldLabel>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="对接人" />
          </Field>
          <Field>
            <FieldLabel>电话</FieldLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>默认结算周期</FieldLabel>
            <select className={sel} value={settlement} onChange={(e) => setSettlement(e.target.value)} disabled={isWalkIn}>
              <option value="cash">现金</option>
              <option value="monthly">月结</option>
              <option value="yearly">年结</option>
            </select>
          </Field>
        </div>
        <Field>
          <FieldLabel>常用地址</FieldLabel>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="公司或常用地址" />
        </Field>
        {isWalkIn ? null : (
          <div className="flex flex-col gap-2 rounded-xl border p-3">
            <div>
              <p className="text-sm font-medium">上门地点</p>
              <p className="text-xs text-muted-foreground">同一单位多个场所：总部、分厂、监控机房等。开工单时选去哪一处。</p>
            </div>
            {sites.map((s, i) => (
              <div key={s.id ?? `new-${i}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  value={s.name}
                  onChange={(e) => setSite(i, { name: e.target.value })}
                  placeholder="名称，如总部、二分厂"
                />
                <Input
                  value={s.address}
                  onChange={(e) => setSite(i, { address: e.target.value })}
                  placeholder="地址，空则用上面常用地址"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (s.id) {
                      if (!confirm(`删除地点「${s.name || "未命名"}」？`)) return;
                      const r = await deleteCustomerSite(s.id);
                      if (!r.ok) {
                        toast.error(r.error);
                        return;
                      }
                    }
                    setSites((rows) => (rows.length <= 1 ? [{ name: "", address: "" }] : rows.filter((_, j) => j !== i)));
                  }}
                >
                  删
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setSites((rows) => [...rows, { name: "", address: "" }])}>
              再加一个地点
            </Button>
          </div>
        )}
        <Field>
          <FieldLabel>备注</FieldLabel>
          <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={isWalkIn}
            onCheckedChange={(v) => {
              const on = !!v;
              setWalkIn(on);
              if (on) setPriceMemory(false);
            }}
          />
          散客（不能月结/年结）
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={priceMemory} disabled={isWalkIn} onCheckedChange={(v) => setPriceMemory(!!v)} />
          价格记忆（开单带出该客户上次成交价）
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={needInvoice} onCheckedChange={(v) => setNeedInvoice(!!v)} />
          要开发票（填税务信息）
        </label>
        {needInvoice ? (
          <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
            <Field>
              <FieldLabel>发票抬头</FieldLabel>
              <Input value={invoiceTitle} onChange={(e) => setInvoiceTitle(e.target.value)} placeholder="空则用名称" />
            </Field>
            <Field>
              <FieldLabel>纳税人识别号</FieldLabel>
              <Input value={taxNo} onChange={(e) => setTaxNo(e.target.value)} required={needInvoice} />
            </Field>
            <Field>
              <FieldLabel>开户银行</FieldLabel>
              <Input value={invoiceBank} onChange={(e) => setInvoiceBank(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>银行账号</FieldLabel>
              <Input value={invoiceAccount} onChange={(e) => setInvoiceAccount(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>开票地址</FieldLabel>
              <Input value={invoiceAddress} onChange={(e) => setInvoiceAddress(e.target.value)} placeholder="空则用上面地址" />
            </Field>
            <Field>
              <FieldLabel>开票电话</FieldLabel>
              <Input value={invoicePhone} onChange={(e) => setInvoicePhone(e.target.value)} placeholder="空则用上面电话" />
            </Field>
          </div>
        ) : null}
        </>
        )}
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className={compact ? "h-12 text-base" : undefined}>
          保存
        </Button>
        {customer && customer.code !== "C0001" ? (
          <Button
            type="button"
            variant="destructive"
            className={compact ? "h-12 text-base" : undefined}
            onClick={async () => {
              if (!confirm(`删除客户「${customer.name}」？有过单据的不能删，请到系统初始化里勾选客户资料整批清。`)) return;
              const r = await deleteCustomer(customer.id);
              if (r.ok) {
                toast.success("已删除");
                router.push("/customers");
                router.refresh();
              } else toast.error(r.error);
            }}
          >
            删除客户
          </Button>
        ) : null}
      </div>
    </form>
  );
}
