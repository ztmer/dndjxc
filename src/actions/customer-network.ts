"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertLoggedIn } from "@/lib/require-session";

async function assertSiteOfCustomer(customerId: string, siteId: string | null) {
  if (!siteId) return null;
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site || site.customerId !== customerId) throw new Error("点位不属于该客户");
  return siteId;
}

async function assertDeviceOfCustomer(customerId: string, deviceId: string | null) {
  if (!deviceId) return null;
  const d = await prisma.customerNetDevice.findUnique({ where: { id: deviceId } });
  if (!d || d.customerId !== customerId) throw new Error("设备不属于该客户");
  return deviceId;
}

function revalidateNetwork(customerId: string) {
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/customers/${customerId}/edit`);
  revalidatePath("/network");
  revalidatePath("/network/devices");
  revalidatePath("/network/ips");
  revalidatePath("/network/tools");
}

export async function saveCustomerBroadband(input: {
  id?: string;
  customerId: string;
  siteId?: string;
  account: string;
  password?: string;
  accessNo?: string;
  isp?: string;
  vlan?: string;
  location?: string;
  remark?: string;
}) {
  await assertLoggedIn();
  try {
    const customerId = input.customerId;
    const cust = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!cust) throw new Error("客户不存在");
    if (input.id) {
      const old = await prisma.customerBroadband.findUnique({ where: { id: input.id } });
      if (!old || old.customerId !== customerId) throw new Error("记录不存在");
    }
    const data = {
      siteId: await assertSiteOfCustomer(customerId, input.siteId || null),
      account: input.account.trim(),
      password: (input.password ?? "").trim(),
      accessNo: (input.accessNo ?? "").trim(),
      isp: (input.isp ?? "").trim(),
      vlan: (input.vlan ?? "").trim(),
      location: (input.location ?? "").trim(),
      remark: (input.remark ?? "").trim(),
    };
    if (!data.account && !data.accessNo) throw new Error("请填写宽带账号或接入号");
    const id = input.id
      ? (await prisma.customerBroadband.update({ where: { id: input.id }, data })).id
      : (await prisma.customerBroadband.create({ data: { ...data, customerId } })).id;
    revalidateNetwork(customerId);
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteCustomerBroadband(id: string) {
  await assertLoggedIn();
  try {
    const row = await prisma.customerBroadband.findUnique({ where: { id } });
    if (!row) throw new Error("记录不存在");
    await prisma.customerBroadband.delete({ where: { id } });
    revalidateNetwork(row.customerId);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function saveCustomerNetDevice(input: {
  id?: string;
  customerId: string;
  siteId?: string;
  name: string;
  ip?: string;
  vendor?: string;
  kind?: string;
  protocol?: string;
  port?: number;
  username?: string;
  password?: string;
  enablePassword?: string;
  model?: string;
  serial?: string;
  location?: string;
  remark?: string;
}) {
  await assertLoggedIn();
  try {
    const customerId = input.customerId;
    const cust = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!cust) throw new Error("客户不存在");
    if (input.id) {
      const old = await prisma.customerNetDevice.findUnique({ where: { id: input.id } });
      if (!old || old.customerId !== customerId) throw new Error("设备不存在");
    }
    const name = input.name.trim();
    if (!name) throw new Error("请填写设备名称");
    const port = Number(input.port ?? 22);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("端口不对");
    const data = {
      siteId: await assertSiteOfCustomer(customerId, input.siteId || null),
      name,
      ip: (input.ip ?? "").trim(),
      vendor: (input.vendor ?? "").trim(),
      kind: (input.kind ?? "switch").trim() || "switch",
      protocol: (input.protocol ?? "ssh").trim() || "ssh",
      port,
      username: (input.username ?? "").trim(),
      password: (input.password ?? "").trim(),
      enablePassword: (input.enablePassword ?? "").trim(),
      model: (input.model ?? "").trim(),
      serial: (input.serial ?? "").trim(),
      location: (input.location ?? "").trim(),
      remark: (input.remark ?? "").trim(),
    };
    const id = input.id
      ? (await prisma.customerNetDevice.update({ where: { id: input.id }, data })).id
      : (await prisma.customerNetDevice.create({ data: { ...data, customerId } })).id;
    revalidateNetwork(customerId);
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteCustomerNetDevice(id: string) {
  await assertLoggedIn();
  try {
    const row = await prisma.customerNetDevice.findUnique({ where: { id } });
    if (!row) throw new Error("设备不存在");
    await prisma.customerNetDevice.delete({ where: { id } });
    revalidateNetwork(row.customerId);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function saveCustomerIpAddr(input: {
  id?: string;
  customerId: string;
  siteId?: string;
  address: string;
  mask?: string;
  name?: string;
  mac?: string;
  hostname?: string;
  usage?: string;
  deviceId?: string;
  remark?: string;
}) {
  await assertLoggedIn();
  try {
    const customerId = input.customerId;
    const cust = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!cust) throw new Error("客户不存在");
    if (input.id) {
      const old = await prisma.customerIpAddr.findUnique({ where: { id: input.id } });
      if (!old || old.customerId !== customerId) throw new Error("地址不存在");
    }
    const address = input.address.trim();
    if (!address) throw new Error("请填写 IP");
    const data = {
      siteId: await assertSiteOfCustomer(customerId, input.siteId || null),
      address,
      mask: (input.mask ?? "24").trim() || "24",
      name: (input.name ?? "").trim(),
      mac: (input.mac ?? "").trim().toLowerCase(),
      hostname: (input.hostname ?? "").trim(),
      usage: (input.usage ?? "").trim(),
      deviceId: await assertDeviceOfCustomer(customerId, input.deviceId || null),
      remark: (input.remark ?? "").trim(),
    };
    const id = input.id
      ? (await prisma.customerIpAddr.update({ where: { id: input.id }, data })).id
      : (await prisma.customerIpAddr.create({ data: { ...data, customerId } })).id;
    revalidateNetwork(customerId);
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteCustomerIpAddr(id: string) {
  await assertLoggedIn();
  try {
    const row = await prisma.customerIpAddr.findUnique({ where: { id } });
    if (!row) throw new Error("地址不存在");
    await prisma.customerIpAddr.delete({ where: { id } });
    revalidateNetwork(row.customerId);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function saveScannedIps(input: {
  customerId: string;
  siteId?: string;
  mask?: string;
  hosts: { ip: string; mac?: string; hostname?: string; name?: string; usage?: string }[];
}) {
  await assertLoggedIn();
  try {
    const customerId = input.customerId;
    const cust = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!cust) throw new Error("客户不存在");
    const siteId = await assertSiteOfCustomer(customerId, input.siteId || null);
    const mask = (input.mask ?? "24").trim() || "24";
    if (!input.hosts.length) throw new Error("没有扫到可写入的地址");
    let added = 0;
    let filled = 0;
    for (const h of input.hosts) {
      const address = h.ip.trim();
      if (!address) continue;
      const name = (h.name ?? "").trim() || (h.hostname ?? "").trim();
      const mac = (h.mac ?? "").trim().toLowerCase();
      const hostname = (h.hostname ?? "").trim();
      const usage = (h.usage ?? "").trim();
      const exist = await prisma.customerIpAddr.findFirst({ where: { customerId, address } });
      if (exist) {
        const next = {
          mac: exist.mac || mac,
          hostname: exist.hostname || hostname,
          name: exist.name || name,
          usage: exist.usage || usage,
          siteId: exist.siteId ?? siteId,
        };
        const changed =
          next.mac !== exist.mac ||
          next.hostname !== exist.hostname ||
          next.name !== exist.name ||
          next.usage !== exist.usage ||
          next.siteId !== exist.siteId;
        if (changed) {
          await prisma.customerIpAddr.update({ where: { id: exist.id }, data: next });
          filled += 1;
        }
      } else {
        await prisma.customerIpAddr.create({
          data: { customerId, siteId, address, mask, mac, hostname, name, usage },
        });
        added += 1;
      }
    }
    revalidateNetwork(customerId);
    return { ok: true as const, added, filled };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function saveCustomerWifi(input: {
  id?: string;
  customerId: string;
  siteId?: string;
  ssid: string;
  password?: string;
  band?: string;
  location?: string;
  remark?: string;
}) {
  await assertLoggedIn();
  try {
    const customerId = input.customerId;
    const cust = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!cust) throw new Error("客户不存在");
    if (input.id) {
      const old = await prisma.customerWifi.findUnique({ where: { id: input.id } });
      if (!old || old.customerId !== customerId) throw new Error("记录不存在");
    }
    const ssid = input.ssid.trim();
    if (!ssid) throw new Error("请填写 Wi-Fi 名称（SSID）");
    const data = {
      siteId: await assertSiteOfCustomer(customerId, input.siteId || null),
      ssid,
      password: (input.password ?? "").trim(),
      band: (input.band ?? "").trim(),
      location: (input.location ?? "").trim(),
      remark: (input.remark ?? "").trim(),
    };
    const id = input.id
      ? (await prisma.customerWifi.update({ where: { id: input.id }, data })).id
      : (await prisma.customerWifi.create({ data: { ...data, customerId } })).id;
    revalidateNetwork(customerId);
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteCustomerWifi(id: string) {
  await assertLoggedIn();
  try {
    const row = await prisma.customerWifi.findUnique({ where: { id } });
    if (!row) throw new Error("记录不存在");
    await prisma.customerWifi.delete({ where: { id } });
    revalidateNetwork(row.customerId);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function pingTarget(host: string) {
  await assertLoggedIn();
  const { sanitizePingTarget } = await import("@/lib/net-tools");
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const run = promisify(execFile);
  const target = sanitizePingTarget(host);
  if (!target) return { ok: false as const, error: "目标只能是 IP 或主机名" };
  try {
    const win = process.platform === "win32";
    const { stdout, stderr } = await run(win ? "ping" : "ping", win ? ["-n", "2", "-w", "2000", target] : ["-c", "2", "-W", "2", target], {
      timeout: 8000,
      windowsHide: true,
    });
    return { ok: true as const, output: (stdout || stderr || "").slice(0, 4000) };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    const output = `${err.stdout || ""}${err.stderr || err.message || ""}`.slice(0, 4000);
    return { ok: false as const, error: output || "ping 失败" };
  }
}

export async function lookupDns(host: string) {
  await assertLoggedIn();
  const { sanitizePingTarget } = await import("@/lib/net-tools");
  const target = sanitizePingTarget(host);
  if (!target) return { ok: false as const, error: "主机名不对" };
  try {
    const dns = await import("dns/promises");
    const r = await dns.lookup(target, { all: true });
    return { ok: true as const, output: r.map((x) => `${x.address} (${x.family === 6 ? "IPv6" : "IPv4"})`).join("\n") || "无记录" };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "解析失败" };
  }
}
