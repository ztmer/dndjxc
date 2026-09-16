import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import dns from "dns/promises";
import {
  calcSubnet,
  isPrivateIpv4,
  parseNeighborTable,
  parsePrefix,
  parseScanCidr,
  type ScanHost,
} from "@/lib/net-tools";

const run = promisify(execFile);

export function listLocalPrivateCidrs(): { cidr: string; ip: string; name: string }[] {
  const out: { cidr: string; ip: string; name: string }[] = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.internal || (String(a.family) !== "IPv4" && String(a.family) !== "4")) continue;
      if (!isPrivateIpv4(a.address)) continue;
      const prefix = parsePrefix(a.netmask || "255.255.255.0") ?? 24;
      const safe = prefix < 24 ? 24 : prefix;
      const sub = calcSubnet(a.address, String(safe));
      if (!sub.ok) continue;
      out.push({ cidr: `${sub.network}/${sub.prefix}`, ip: a.address, name });
    }
  }
  return out;
}

async function pingOne(ip: string) {
  const win = process.platform === "win32";
  try {
    await run("ping", win ? ["-n", "1", "-w", "400", ip] : ["-c", "1", "-W", "1", ip], {
      timeout: 1500,
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => worker()));
  return out;
}

async function neighborText() {
  try {
    if (process.platform === "win32") {
      const { stdout } = await run("arp", ["-a"], { timeout: 8000, windowsHide: true });
      return stdout;
    }
    const { stdout } = await run("ip", ["-4", "neigh", "show"], { timeout: 8000 });
    return stdout;
  } catch {
    try {
      const { stdout } = await run("arp", ["-an"], { timeout: 8000, windowsHide: true });
      return stdout;
    } catch {
      return "";
    }
  }
}

async function reverseName(ip: string) {
  try {
    const names = await dns.reverse(ip);
    return names[0] || "";
  } catch {
    return "";
  }
}

export async function scanPrivateLan(cidrInput?: string): Promise<{ cidr: string; hosts: ScanHost[] } | { error: string }> {
  const local = listLocalPrivateCidrs();
  const raw = (cidrInput || local[0]?.cidr || "").trim();
  if (!raw) return { error: "本机没有内网网卡，请填写网段如 192.168.10.0/24" };
  const parsed = parseScanCidr(raw);
  if (!parsed.ok) return { error: parsed.error };
  const hostSet = new Set(parsed.hosts);
  const alive = new Set<string>();
  await mapPool(parsed.hosts, 40, async (ip) => {
    if (await pingOne(ip)) alive.add(ip);
  });
  const macs = parseNeighborTable(await neighborText());
  const localIps = new Set(local.filter((x) => x.cidr === parsed.cidr).map((x) => x.ip));
  const seen = new Set<string>();
  const hosts: ScanHost[] = [];
  const add = async (ip: string) => {
    if (!hostSet.has(ip) && !localIps.has(ip)) return;
    if (seen.has(ip)) return;
    seen.add(ip);
    const hostname = await reverseName(ip);
    const mac = macs.get(ip) || "";
    hosts.push({ ip, mac, hostname, name: hostname });
  };
  for (const ip of parsed.hosts) {
    if (alive.has(ip) || macs.has(ip) || localIps.has(ip)) await add(ip);
  }
  for (const ip of macs.keys()) await add(ip);
  for (const ip of localIps) await add(ip);
  hosts.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
  return { cidr: parsed.cidr, hosts };
}
