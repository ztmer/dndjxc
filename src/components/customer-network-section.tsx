import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BroadbandForm, NetDeviceForm, IpAddrList, WifiForm, labelNetKind, labelNetVendor } from "@/components/forms/customer-network-forms";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Site = { id: string; name: string };
type Acc = {
  id: string;
  account: string;
  password: string;
  accessNo: string;
  isp: string;
  vlan: string;
  location: string;
  remark: string;
  siteId: string | null;
};
type Dev = {
  id: string;
  name: string;
  ip: string;
  vendor: string;
  kind: string;
  protocol: string;
  port: number;
  username: string;
  password: string;
  enablePassword: string;
  model: string;
  serial: string;
  location: string;
  remark: string;
  siteId: string | null;
};
type Ip = {
  id: string;
  address: string;
  mask: string;
  name?: string;
  mac?: string;
  hostname?: string;
  usage: string;
  remark: string;
  siteId: string | null;
  deviceId: string | null;
};
type Wifi = {
  id: string;
  ssid: string;
  password: string;
  band: string;
  location: string;
  remark: string;
  siteId: string | null;
};

export function CustomerNetworkSection({
  customerId,
  sites,
  accounts,
  devices,
  ips,
  wifis,
}: {
  customerId: string;
  sites: Site[];
  accounts: Acc[];
  devices: Dev[];
  ips: Ip[];
  wifis: Wifi[];
}) {
  return (
    <div id="network" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">网络资料</h2>
        <div className="flex gap-2">
          <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={`/network/tools?customerId=${customerId}`}>
            调试工具
          </Link>
          <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={`/network/ips?customerId=${customerId}`}>
            IP 扫描
          </Link>
          <a className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={`/api/customers/${customerId}/network`}>
            接口 JSON
          </a>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>宽带账号</CardTitle>
          <CardDescription>账号、密码、接入号、位置。改完后网络页自动同一份数据。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-lg border p-3">
              <p className="mb-2 text-sm text-muted-foreground">
                {a.isp || "宽带"} {a.account ? `· ${a.account}` : ""} {a.accessNo ? `· 接入号 ${a.accessNo}` : ""}
                {a.location ? ` · ${a.location}` : ""}
              </p>
              <BroadbandForm customerId={customerId} sites={sites} row={a} />
            </div>
          ))}
          <BroadbandForm customerId={customerId} sites={sites} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>网络设备</CardTitle>
          <CardDescription>交换机 / 路由 / 光猫。字段对齐常见运维台账。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {devices.map((d) => (
            <div key={d.id} className="rounded-lg border p-3">
              <p className="mb-2 text-sm text-muted-foreground">
                {d.name} · {labelNetKind(d.kind)} · {labelNetVendor(d.vendor)} {d.ip ? `· ${d.ip}` : ""}
              </p>
              <NetDeviceForm customerId={customerId} sites={sites} row={d} />
            </div>
          ))}
          <NetDeviceForm customerId={customerId} sites={sites} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>IP 地址</CardTitle>
          <CardDescription>网关、打印机、监控等固定地址，避免和 DHCP 打架。</CardDescription>
        </CardHeader>
        <CardContent>
          <IpAddrList
            customerId={customerId}
            sites={sites}
            devices={devices.map((d) => ({ id: d.id, name: d.name }))}
            rows={ips}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Wi-Fi</CardTitle>
          <CardDescription>SSID 和密码由客户提供后登记。无线密码无法从网段扫描得到。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {wifis.map((w) => (
            <div key={w.id} className="rounded-lg border p-3">
              <p className="mb-2 text-sm text-muted-foreground">
                {w.ssid}
                {w.band ? ` · ${w.band}G` : ""}
                {w.location ? ` · ${w.location}` : ""}
              </p>
              <WifiForm customerId={customerId} sites={sites} row={w} />
            </div>
          ))}
          <WifiForm customerId={customerId} sites={sites} />
        </CardContent>
      </Card>
    </div>
  );
}
