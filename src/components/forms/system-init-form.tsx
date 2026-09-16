"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { runSystemInit } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

const RESET_PHRASE = "重新开始";

export function SystemInitForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
  const [phrase, setPhrase] = useState("");
  const [documents, setDocuments] = useState(true);
  const [customers, setCustomers] = useState(true);
  const [suppliers, setSuppliers] = useState(false);

  async function run(reset?: { documents?: boolean; customers?: boolean; suppliers?: boolean }) {
    setBusy(true);
    const r = await runSystemInit(reset ? { reset } : {});
    setBusy(false);
    if (r.ok) {
      toast.success(reset ? "已按勾选清空并补缺" : "初始化完成");
      setLines(r.steps.map((s) => `${s.name}：${s.detail}`));
      setPhrase("");
      router.refresh();
    } else toast.error(r.error);
  }

  const picked = documents || customers || suppliers;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          只补缺：公司、门店仓、散客、商品分类、商品品牌、知识库、打印/报表模板、委外维修商品。不会删销售单、工单，也不会改账号密码。
        </p>
        <Button
          disabled={busy}
          onClick={async () => {
            if (!confirm("执行系统初始化？只会补缺，不会清空业务数据。")) return;
            await run();
          }}
        >
          {busy ? "正在处理…" : "执行初始化（只补缺）"}
        </Button>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-4">
        <h3 className="text-sm font-medium text-destructive">选择性清空</h3>
        <p className="text-sm text-muted-foreground">
          勾哪项清哪项。商品分类、品牌、知识库、本店商品、账号不删。此操作不可恢复。
        </p>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={documents}
            onCheckedChange={(v) => setDocuments(!!v)}
            className="mt-0.5"
          />
          <span>
            单据、库存、串号
            <span className="mt-0.5 block text-xs text-muted-foreground">销售/工单/合同/采购/其它出入库、结存、应收对账单。库存数量归零。</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={customers}
            onCheckedChange={(v) => {
              const on = !!v;
              setCustomers(on);
              if (on) setDocuments(true);
            }}
            className="mt-0.5"
          />
          <span>
            客户资料
            <span className="mt-0.5 block text-xs text-muted-foreground">单位、老客、以及自己建的散客档案全部删掉，只留系统散客 C0001。有单据时会自动同时清单据。</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={suppliers} onCheckedChange={(v) => setSuppliers(!!v)} className="mt-0.5" />
          <span>
            供应商资料
            <span className="mt-0.5 block text-xs text-muted-foreground">批发商名单清空。进货单上的供应商会摘掉（若没勾单据，进货单还在）。</span>
          </span>
        </label>
        <Field>
          <FieldLabel>请输入「{RESET_PHRASE}」确认</FieldLabel>
          <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={RESET_PHRASE} autoComplete="off" />
        </Field>
        <Button
          variant="destructive"
          disabled={busy || !picked || phrase.trim() !== RESET_PHRASE}
          onClick={async () => {
            if (!confirm("确定按勾选清空？不可恢复。")) return;
            await run({ documents, customers, suppliers });
          }}
        >
          {busy ? "正在清空…" : "按勾选清空并初始化"}
        </Button>
      </section>

      {lines.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {lines.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
