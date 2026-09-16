"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveWecomInfo, testWecomPush } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { parseWecomDocTypes, WECOM_DOC_OPTIONS, type WecomDocType } from "@/lib/wecom-docs";

type Cfg = {
  enabled: boolean;
  webhookUrl: string;
  onCreate: boolean;
  onSubmit: boolean;
  mentionAll: boolean;
  docTypes?: string;
};

export function WecomForm({ cfg }: { cfg?: Cfg | null }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(cfg?.enabled ?? false);
  const [webhookUrl, setWebhookUrl] = useState(cfg?.webhookUrl ?? "");
  const [onCreate, setOnCreate] = useState(cfg?.onCreate ?? true);
  const [onSubmit, setOnSubmit] = useState(cfg?.onSubmit ?? true);
  const [mentionAll, setMentionAll] = useState(cfg?.mentionAll ?? false);
  const [docTypes, setDocTypes] = useState<WecomDocType[]>(() => parseWecomDocTypes(cfg?.docTypes));
  const [testing, setTesting] = useState(false);

  function toggleType(v: WecomDocType, on: boolean) {
    setDocTypes((prev) => {
      if (on) return WECOM_DOC_OPTIONS.map((x) => x.value).filter((k) => k === v || prev.includes(k));
      return prev.filter((x) => x !== v);
    });
  }

  return (
    <form
      className="flex max-w-3xl flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!docTypes.length) {
          toast.error("请至少勾选一种要推送的单据");
          return;
        }
        const r = await saveWecomInfo({ enabled, webhookUrl, onCreate, onSubmit, mentionAll, docTypes });
        if (r.ok) {
          toast.success("企业微信设置已保存");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">Webhook 怎么填</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>用电脑打开企业微信，进入要收单据图片的群。</li>
          <li>点群名 → 群设置 → 群机器人 → 添加机器人（没有入口时请店主/群主操作）。</li>
          <li>新建机器人后点「复制 Webhook 地址」，整段粘贴到下面输入框。</li>
          <li>
            地址必须是{" "}
            <code className="rounded bg-background px-1 text-xs">https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=……</code>
            ，不要改、不要截断。
          </li>
          <li>勾选「启用推送」并保存。下面勾选的单据，在新建或审核时会做成图片发进该群。</li>
          <li>装机单用专用版式（槽位/配件/数量/串号），不显示单价。送货单与销售单同源，勾了就会各发一张图。</li>
          <li>可先点「发一张测试图」：按已勾选类型找最近一张单据（没有则发样例图）。失败看系统日志。</li>
        </ol>
        <p className="mt-2">机器人只能发到本群；换群要换 Webhook。图片走群机器人接口，不必配企业微信应用 Secret。</p>
      </div>
      <FieldGroup>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(!!v)} />
          启用推送（关掉后不再发，Webhook 仍保留）
        </label>
        <Field>
          <FieldLabel>群机器人 Webhook</FieldLabel>
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key="
            autoComplete="off"
          />
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium">推送哪些单据</p>
          <div className="flex flex-col gap-2">
            {WECOM_DOC_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <Checkbox checked={docTypes.includes(opt.value)} onCheckedChange={(v) => toggleType(opt.value, !!v)} />
                {opt.label}
                {opt.value === "installSheet" ? <span className="text-muted-foreground">（专用装机单格式，无单价）</span> : null}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={onCreate} onCheckedChange={(v) => setOnCreate(!!v)} />
          新建单据时发送（第一次生成单号）
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={onSubmit} onCheckedChange={(v) => setOnSubmit(!!v)} />
          审核确认时再发一张
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={mentionAll} onCheckedChange={(v) => setMentionAll(!!v)} />
          同时 @所有人（群会响，人少的技术群才建议开）
        </label>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">保存</Button>
        <Button
          type="button"
          variant="outline"
          disabled={testing}
          onClick={async () => {
            setTesting(true);
            const r = await testWecomPush();
            setTesting(false);
            if (r.ok) toast.success(r.message);
            else toast.error(r.error);
          }}
        >
          {testing ? "发送中…" : "发一张测试图"}
        </Button>
      </div>
    </form>
  );
}
