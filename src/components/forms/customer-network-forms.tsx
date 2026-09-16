"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  saveCustomerBroadband,
  deleteCustomerBroadband,
  saveCustomerNetDevice,
  deleteCustomerNetDevice,
  saveCustomerIpAddr,
  deleteCustomerIpAddr,
  saveCustomerWifi,
  deleteCustomerWifi,
} from "@/actions/customer-network";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NET_DEVICE_KIND, NET_PROTOCOL, NET_VENDOR, label } from "@/lib/labels";

const sel = "h-8 w-full rounded-lg border bg-background px-2 text-sm";

type SiteOpt = { id: string; name: string };

function SiteSelect({ sites, value, onChange }: { sites: SiteOpt[]; value: string; onChange: (v: string) => void }) {
  return (
    <select className={sel} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">不指定点位</option>
      {sites.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

export function BroadbandForm({
  customerId,
  sites,
  row,
}: {
  customerId: string;
  sites: SiteOpt[];
  row?: {
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
}) {
  const router = useRouter();
  const [account, setAccount] = useState(row?.account ?? "");
  const [password, setPassword] = useState(row?.password ?? "");
  const [accessNo, setAccessNo] = useState(row?.accessNo ?? "");
  const [isp, setIsp] = useState(row?.isp ?? "");
  const [vlan, setVlan] = useState(row?.vlan ?? "");
  const [location, setLocation] = useState(row?.location ?? "");
  const [remark, setRemark] = useState(row?.remark ?? "");
  const [siteId, setSiteId] = useState(row?.siteId ?? "");
  const [showPw, setShowPw] = useState(false);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveCustomerBroadband({
          id: row?.id,
          customerId,
          siteId,
          account,
          password,
          accessNo,
          isp,
          vlan,
          location,
          remark,
        });
        if (r.ok) {
          toast.success("已保存宽带资料，客户页与网络页已同步");
          if (!row) {
            setAccount("");
            setPassword("");
            setAccessNo("");
            setIsp("");
            setVlan("");
            setLocation("");
            setRemark("");
          }
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <Field>
        <FieldLabel>宽带账号</FieldLabel>
        <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="拨号账号" />
      </Field>
      <Field>
        <FieldLabel>密码</FieldLabel>
        <div className="flex gap-2">
          <Input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="button" variant="outline" onClick={() => setShowPw((v) => !v)}>
            {showPw ? "藏" : "看"}
          </Button>
        </div>
      </Field>
      <Field>
        <FieldLabel>接入号</FieldLabel>
        <Input value={accessNo} onChange={(e) => setAccessNo(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>运营商</FieldLabel>
        <Input value={isp} onChange={(e) => setIsp(e.target.value)} placeholder="电信 / 移动 / 联通" />
      </Field>
      <Field>
        <FieldLabel>VLAN</FieldLabel>
        <Input value={vlan} onChange={(e) => setVlan(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>位置</FieldLabel>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="弱电间 / 前台" />
      </Field>
      <Field>
        <FieldLabel>点位</FieldLabel>
        <SiteSelect sites={sites} value={siteId} onChange={setSiteId} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel>备注</FieldLabel>
        <Input value={remark} onChange={(e) => setRemark(e.target.value)} />
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit">{row ? "保存这条" : "添加宽带"}</Button>
        {row ? (
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              if (!confirm("删除这条宽带资料？")) return;
              const r = await deleteCustomerBroadband(row.id);
              if (r.ok) {
                toast.success("已删除并同步");
                router.refresh();
              } else toast.error(r.error);
            }}
          >
            删除
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function NetDeviceForm({
  customerId,
  sites,
  row,
}: {
  customerId: string;
  sites: SiteOpt[];
  row?: {
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
}) {
  const router = useRouter();
  const [name, setName] = useState(row?.name ?? "");
  const [ip, setIp] = useState(row?.ip ?? "");
  const [vendor, setVendor] = useState(row?.vendor ?? "huawei");
  const [kind, setKind] = useState(row?.kind ?? "switch");
  const [protocol, setProtocol] = useState(row?.protocol ?? "ssh");
  const [port, setPort] = useState(String(row?.port ?? 22));
  const [username, setUsername] = useState(row?.username ?? "");
  const [password, setPassword] = useState(row?.password ?? "");
  const [enablePassword, setEnable] = useState(row?.enablePassword ?? "");
  const [model, setModel] = useState(row?.model ?? "");
  const [serial, setSerial] = useState(row?.serial ?? "");
  const [location, setLocation] = useState(row?.location ?? "");
  const [remark, setRemark] = useState(row?.remark ?? "");
  const [siteId, setSiteId] = useState(row?.siteId ?? "");

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveCustomerNetDevice({
          id: row?.id,
          customerId,
          siteId,
          name,
          ip,
          vendor,
          kind,
          protocol,
          port: Number(port),
          username,
          password,
          enablePassword,
          model,
          serial,
          location,
          remark,
        });
        if (r.ok) {
          toast.success("已保存设备，客户页已同步");
          if (!row) {
            setName("");
            setIp("");
            setModel("");
            setSerial("");
            setUsername("");
            setPassword("");
            setEnable("");
            setLocation("");
            setRemark("");
          }
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <Field>
        <FieldLabel>设备名称</FieldLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="核心交换机" />
      </Field>
      <Field>
        <FieldLabel>管理 IP</FieldLabel>
        <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.1" />
      </Field>
      <Field>
        <FieldLabel>类型</FieldLabel>
        <select className={sel} value={kind} onChange={(e) => setKind(e.target.value)}>
          {Object.entries(NET_DEVICE_KIND).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel>厂商</FieldLabel>
        <select className={sel} value={vendor} onChange={(e) => setVendor(e.target.value)}>
          {Object.entries(NET_VENDOR).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel>协议</FieldLabel>
        <select className={sel} value={protocol} onChange={(e) => setProtocol(e.target.value)}>
          {Object.entries(NET_PROTOCOL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel>端口</FieldLabel>
        <Input value={port} onChange={(e) => setPort(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>用户名</FieldLabel>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>密码</FieldLabel>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>Enable 密码</FieldLabel>
        <Input type="password" value={enablePassword} onChange={(e) => setEnable(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>型号</FieldLabel>
        <Input value={model} onChange={(e) => setModel(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>序列号</FieldLabel>
        <Input value={serial} onChange={(e) => setSerial(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>位置</FieldLabel>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>点位</FieldLabel>
        <SiteSelect sites={sites} value={siteId} onChange={setSiteId} />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel>描述</FieldLabel>
        <Input value={remark} onChange={(e) => setRemark(e.target.value)} />
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit">{row ? "保存设备" : "添加设备"}</Button>
        {row ? (
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              if (!confirm(`删除设备「${row.name}」？`)) return;
              const r = await deleteCustomerNetDevice(row.id);
              if (r.ok) {
                toast.success("已删除并同步");
                router.refresh();
              } else toast.error(r.error);
            }}
          >
            删除
          </Button>
        ) : null}
      </div>
    </form>
  );
}

type IpRow = {
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

/** 一行输入：IP / 掩码 / 名称 / MAC / 用途，不再用整页格子表单。 */
export function IpAddrForm({
  customerId,
  sites,
  devices,
  row,
  onCancel,
}: {
  customerId: string;
  sites: SiteOpt[];
  devices: { id: string; name: string }[];
  row?: IpRow;
  onCancel?: () => void;
}) {
  void sites;
  void devices;
  const router = useRouter();
  const [address, setAddress] = useState(row?.address ?? "");
  const [mask, setMask] = useState(row?.mask ?? "24");
  const [name, setName] = useState(row?.name ?? "");
  const [mac, setMac] = useState(row?.mac ?? "");
  const [usage, setUsage] = useState(row?.usage ?? "");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveCustomerIpAddr({
          id: row?.id,
          customerId,
          siteId: row?.siteId ?? "",
          address,
          mask,
          name,
          mac,
          hostname: row?.hostname ?? "",
          usage,
          deviceId: row?.deviceId ?? "",
          remark: row?.remark ?? "",
        });
        if (r.ok) {
          toast.success("已保存 IP，客户页已同步");
          if (!row) {
            setAddress("");
            setUsage("");
            setName("");
            setMac("");
            setMask("24");
          }
          onCancel?.();
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <Field className="min-w-[9rem] flex-1">
        <FieldLabel>IP</FieldLabel>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="192.168.1.10" className="font-mono" />
      </Field>
      <Field className="w-16 shrink-0">
        <FieldLabel>掩码</FieldLabel>
        <Input value={mask} onChange={(e) => setMask(e.target.value)} placeholder="24" />
      </Field>
      <Field className="min-w-[7rem] flex-1">
        <FieldLabel>名称</FieldLabel>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="打印机" />
      </Field>
      <Field className="min-w-[9rem] flex-1">
        <FieldLabel>MAC</FieldLabel>
        <Input value={mac} onChange={(e) => setMac(e.target.value)} placeholder="aa:bb:cc:dd:ee:ff" className="font-mono" />
      </Field>
      <Field className="min-w-[7rem] flex-1">
        <FieldLabel>用途</FieldLabel>
        <Input value={usage} onChange={(e) => setUsage(e.target.value)} placeholder="网关 / 监控" />
      </Field>
      <div className="flex items-end gap-2 pb-0.5">
        <Button type="submit">{row ? "保存" : "添加"}</Button>
        {row ? (
          <>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
            ) : null}
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (!confirm("删除这条 IP？")) return;
                const r = await deleteCustomerIpAddr(row.id);
                if (r.ok) {
                  toast.success("已删除并同步");
                  router.refresh();
                } else toast.error(r.error);
              }}
            >
              删除
            </Button>
          </>
        ) : null}
      </div>
    </form>
  );
}

export function IpAddrList({
  customerId,
  sites,
  devices,
  rows,
}: {
  customerId: string;
  sites: SiteOpt[];
  devices: { id: string; name: string }[];
  rows: IpRow[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有固定 IP。</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((ip) => (
            <li key={ip.id} className="px-3 py-2">
              {editingId === ip.id ? (
                <IpAddrForm customerId={customerId} sites={sites} devices={devices} row={ip} onCancel={() => setEditingId(null)} />
              ) : (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-mono text-sm font-medium">
                    {ip.address}/{ip.mask}
                  </span>
                  {ip.name ? <span className="text-sm">{ip.name}</span> : null}
                  {ip.mac ? <span className="font-mono text-xs text-muted-foreground">{ip.mac}</span> : null}
                  {ip.hostname ? <span className="text-sm text-muted-foreground">{ip.hostname}</span> : null}
                  {ip.usage ? <span className="text-sm text-muted-foreground">{ip.usage}</span> : null}
                  {ip.remark ? <span className="text-sm text-muted-foreground">{ip.remark}</span> : null}
                  <span className="ml-auto flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(ip.id)}>
                      改
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={async () => {
                        if (!confirm("删除这条 IP？")) return;
                        const r = await deleteCustomerIpAddr(ip.id);
                        if (r.ok) {
                          toast.success("已删除并同步");
                          router.refresh();
                        } else toast.error(r.error);
                      }}
                    >
                      删
                    </Button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm font-medium">添加 IP</p>
      <IpAddrForm customerId={customerId} sites={sites} devices={devices} />
    </div>
  );
}

export function WifiForm({
  customerId,
  sites,
  row,
}: {
  customerId: string;
  sites: SiteOpt[];
  row?: {
    id: string;
    ssid: string;
    password: string;
    band: string;
    location: string;
    remark: string;
    siteId: string | null;
  };
}) {
  const router = useRouter();
  const [ssid, setSsid] = useState(row?.ssid ?? "");
  const [password, setPassword] = useState(row?.password ?? "");
  const [band, setBand] = useState(row?.band ?? "2.4");
  const [location, setLocation] = useState(row?.location ?? "");
  const [remark, setRemark] = useState(row?.remark ?? "");
  const [siteId, setSiteId] = useState(row?.siteId ?? "");
  const [showPw, setShowPw] = useState(false);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveCustomerWifi({ id: row?.id, customerId, siteId, ssid, password, band, location, remark });
        if (r.ok) {
          toast.success("已保存 Wi-Fi，客户页已同步");
          if (!row) {
            setSsid("");
            setPassword("");
            setLocation("");
            setRemark("");
          }
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <Field>
        <FieldLabel>SSID</FieldLabel>
        <Input value={ssid} onChange={(e) => setSsid(e.target.value)} required placeholder="办公-5G" />
      </Field>
      <Field>
        <FieldLabel>密码</FieldLabel>
        <div className="flex gap-2">
          <Input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="button" variant="outline" onClick={() => setShowPw((v) => !v)}>
            {showPw ? "藏" : "看"}
          </Button>
        </div>
      </Field>
      <Field>
        <FieldLabel>频段</FieldLabel>
        <select className={sel} value={band} onChange={(e) => setBand(e.target.value)}>
          <option value="2.4">2.4G</option>
          <option value="5">5G</option>
          <option value="6">6G</option>
          <option value="">不区分</option>
        </select>
      </Field>
      <Field>
        <FieldLabel>位置</FieldLabel>
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="前台 / 仓库" />
      </Field>
      <Field>
        <FieldLabel>点位</FieldLabel>
        <SiteSelect sites={sites} value={siteId} onChange={setSiteId} />
      </Field>
      <Field>
        <FieldLabel>备注</FieldLabel>
        <Input value={remark} onChange={(e) => setRemark(e.target.value)} />
      </Field>
      <div className="flex items-end gap-2">
        <Button type="submit">{row ? "保存 Wi-Fi" : "添加 Wi-Fi"}</Button>
        {row ? (
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              if (!confirm(`删除 Wi-Fi「${row.ssid}」？`)) return;
              const r = await deleteCustomerWifi(row.id);
              if (r.ok) {
                toast.success("已删除并同步");
                router.refresh();
              } else toast.error(r.error);
            }}
          >
            删除
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function labelNetKind(kind: string) {
  return label(NET_DEVICE_KIND, kind);
}
export function labelNetVendor(vendor: string) {
  return vendor ? label(NET_VENDOR, vendor) : "—";
}
