"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveShopBiz } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function ShopBizForm({ forceOutboundSn, openingMode }: { forceOutboundSn: boolean; openingMode: boolean }) {
  const router = useRouter();
  const [force, setForce] = useState(forceOutboundSn);
  const [opening, setOpening] = useState(openingMode);

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveShopBiz({ forceOutboundSn: force, openingMode: opening });
        if (r.ok) {
          toast.success("开单规则已保存");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">出库要不要扫唯一 SN</p>
        <p>
          默认<strong className="text-foreground">不强制</strong>：没扫码就按数量出库；扫了的码会记到保修档案，但不能多于数量。
          硬盘、内存等仍建议扫，方便以后查保修。
        </p>
        <p className="mt-2">若店里要求一台一码必须扫齐，再勾下面开关。入库（采购进货）仍按商品资料「管唯一 SN」扫码，不受此开关影响。</p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={force} onCheckedChange={(v) => setForce(!!v)} className="mt-0.5" />
        <span>
          出库强制扫齐唯一 SN
          <span className="mt-0.5 block text-muted-foreground">销售、工单用料、组装配置、其它出库：管 SN 的商品数量和扫码个数必须一样多</span>
        </span>
      </label>
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">期初录入（补旧账）</p>
        <p>
          刚上系统时打开：销售单、工单可勾「期初旧单」，自选开单日期。旧单<strong className="text-foreground">不扣库存、不扫串号</strong>，金额进客户未收。
          录完请关掉，以免平时误开成旧单。
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={opening} onCheckedChange={(v) => setOpening(!!v)} className="mt-0.5" />
        <span>
          打开期初录入
          <span className="mt-0.5 block text-muted-foreground">销售开单、工单里会出现「期初旧单」和开单日期</span>
        </span>
      </label>
      <Button type="submit" className="self-start">
        保存
      </Button>
    </form>
  );
}
