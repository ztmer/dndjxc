"use client";

import { useState } from "react";
import { toast } from "sonner";
import { pingTarget, lookupDns } from "@/actions/customer-network";
import { calcSubnet, COMMON_NET_COMMANDS } from "@/lib/net-tools";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NetworkToolsPanel({ defaultHost }: { defaultHost?: string }) {
  const [host, setHost] = useState(defaultHost ?? "");
  const [out, setOut] = useState("");
  const [ip, setIp] = useState("192.168.1.10");
  const [mask, setMask] = useState("24");
  const [subnetText, setSubnetText] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Ping / DNS</CardTitle>
          <CardDescription>从本机服务器探测客户地址，只允许 IP 或主机名。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field>
            <FieldLabel>目标</FieldLabel>
            <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.1 或 www.baidu.com" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={async () => {
                const r = await pingTarget(host);
                if (r.ok) setOut(r.output);
                else {
                  setOut(r.error);
                  toast.error("Ping 未通");
                }
              }}
            >
              Ping
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const r = await lookupDns(host);
                if (r.ok) setOut(r.output);
                else {
                  setOut(r.error);
                  toast.error("解析失败");
                }
              }}
            >
              DNS 查询
            </Button>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted p-3 text-xs">{out || "结果会显示在这里"}</pre>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>子网计算</CardTitle>
          <CardDescription>划分固定段和 DHCP 段时用。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Field>
              <FieldLabel>IP</FieldLabel>
              <Input value={ip} onChange={(e) => setIp(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>掩码</FieldLabel>
              <Input value={mask} onChange={(e) => setMask(e.target.value)} />
            </Field>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const r = calcSubnet(ip, mask);
              if (!r.ok) {
                toast.error(r.error);
                setSubnetText("");
                return;
              }
              setSubnetText(
                [`网段 ${r.network}/${r.prefix}`, `掩码 ${r.netmask}`, `广播 ${r.broadcast}`, `可用 ${r.firstHost} – ${r.lastHost}（${r.hostCount}）`, `常用网关 ${r.gatewayHint}`].join("\n"),
              );
            }}
          >
            计算
          </Button>
          <pre className="min-h-32 whitespace-pre-wrap rounded-lg border bg-muted p-3 text-xs">{subnetText || "填 IP 和 24 位掩码后计算"}</pre>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>常用命令</CardTitle>
          <CardDescription>到客户现场在电脑上执行，不是扫描别人的网。</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {COMMON_NET_COMMANDS.map((c) => (
              <li key={c.title} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{c.title}</p>
                <p className="mt-1 font-mono text-xs">Win：{c.win}</p>
                <p className="font-mono text-xs">Linux：{c.linux}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
