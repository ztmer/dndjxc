"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveScannedIps } from "@/actions/customer-network";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScanHost } from "@/lib/net-tools";

export function LanScanPanel({
  customerId,
  sites,
}: {
  customerId?: string;
  sites: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [cidrs, setCidrs] = useState<{ cidr: string; ip: string; name: string }[]>([]);
  const [cidr, setCidr] = useState("");
  const [busy, setBusy] = useState(false);
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/network/scan");
      const json = (await res.json()) as { cidrs?: { cidr: string; ip: string; name: string }[] };
      const list = json.cidrs ?? [];
      setCidrs(list);
      if (!cidr && list[0]) setCidr(list[0].cidr);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>扫描本机局域网</CardTitle>
        <CardDescription>
          扫完写入所选客户资料。同一客户再扫只补新地址，已有记录不删。本页不留扫描清单，关掉即无。Wi-Fi 密码扫不出来，到客户资料里填。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field className="sm:col-span-2">
            <FieldLabel>网段</FieldLabel>
            <Input value={cidr} onChange={(e) => setCidr(e.target.value)} placeholder="192.168.10.0/24" />
            {cidrs.length ? (
              <p className="mt-1 text-xs text-muted-foreground">
                本机：
                {cidrs.map((c) => (
                  <button key={c.cidr + c.ip} type="button" className="ml-2 underline" onClick={() => setCidr(c.cidr)}>
                    {c.cidr}（{c.ip}）
                  </button>
                ))}
              </p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel>保存到点位</FieldLabel>
            <select className="h-8 w-full rounded-lg border bg-background px-2 text-sm" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">不指定</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!customerId) {
                toast.error("请先点上方客户，再扫描");
                return;
              }
              setBusy(true);
              try {
                const res = await fetch("/api/network/scan", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ cidr }),
                });
                const json = (await res.json()) as { error?: string; hosts?: ScanHost[] };
                if (!res.ok || json.error) throw new Error(json.error || "扫描失败");
                const hosts = json.hosts ?? [];
                if (!hosts.length) {
                  toast.message("这网段没有扫到在线设备");
                  return;
                }
                const prefix = cidr.split("/")[1]?.trim();
                const r = await saveScannedIps({ customerId, siteId, mask: prefix, hosts });
                if (!r.ok) throw new Error(r.error);
                toast.success(`已写入客户资料：新增 ${r.added} 条${r.filled ? `，补全 ${r.filled} 条` : ""}`);
                router.push(`/customers/${customerId}#network`);
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "扫描失败");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "扫描中，大约半分钟…" : "开始扫描"}
          </Button>
        </div>
        {!customerId ? <p className="text-sm text-muted-foreground">请先选择客户。扫完进该客户资料，本页不保存清单。</p> : null}
      </CardContent>
    </Card>
  );
}
