/** 店内排障用的目标串：主机名或 IP，禁止空格与命令拼接。 */
export function sanitizePingTarget(input: string): string | null {
  const s = input.trim();
  if (!s || s.length > 64) return null;
  if (s.startsWith("-") || s.includes("..") || s.includes("/") || s.includes("\\")) return null;
  if (!/^[a-zA-Z0-9.:-]+$/.test(s)) return null;
  return s;
}

export function ipv4ToInt(ip: string): number | null {
  const p = ip.split(".");
  if (p.length !== 4) return null;
  const n = p.map((x) => Number(x));
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
  return ((n[0] << 24) | (n[1] << 16) | (n[2] << 8) | n[3]) >>> 0;
}

export function intToIpv4(n: number) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

export function parsePrefix(mask: string): number | null {
  const m = mask.trim();
  if (/^\d{1,2}$/.test(m)) {
    const p = Number(m);
    if (p < 8 || p > 32) return null;
    return p;
  }
  const dotted = ipv4ToInt(m);
  if (dotted == null) return null;
  let bits = 0;
  let v = dotted;
  for (let i = 0; i < 32; i++) {
    if (v & 0x80000000) bits++;
    else break;
    v <<= 1;
  }
  if (bits < 8 || bits > 32) return null;
  const expected = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  if (dotted !== expected) return null;
  return bits;
}

export function calcSubnet(ip: string, mask: string) {
  const addr = ipv4ToInt(ip.trim());
  const prefix = parsePrefix(mask);
  if (addr == null || prefix == null) return { ok: false as const, error: "请填写合法 IPv4 和掩码（如 24 或 255.255.255.0）" };
  const netmask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = addr & netmask;
  const broadcast = network | (~netmask >>> 0);
  const hosts = prefix >= 31 ? 0 : Math.max(0, broadcast - network - 1);
  const first = prefix >= 31 ? network : network + 1;
  const last = prefix >= 31 ? broadcast : broadcast - 1;
  return {
    ok: true as const,
    prefix,
    network: intToIpv4(network),
    netmask: intToIpv4(netmask),
    broadcast: intToIpv4(broadcast),
    firstHost: intToIpv4(first),
    lastHost: intToIpv4(last),
    hostCount: hosts,
    gatewayHint: intToIpv4(first),
  };
}

export function isPrivateIpv4(ip: string) {
  const n = ipv4ToInt(ip);
  if (n == null) return false;
  const a = (n >>> 24) & 255;
  const b = (n >>> 16) & 255;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function normalizeMac(raw: string) {
  const hex = raw.trim().toLowerCase().replace(/-/g, ":").replace(/[^0-9a-f:]/g, "");
  const parts = hex.split(":").filter(Boolean);
  if (parts.length === 6 && parts.every((p) => /^[0-9a-f]{2}$/.test(p))) return parts.join(":");
  const compact = raw.trim().toLowerCase().replace(/[^0-9a-f]/g, "");
  if (compact.length === 12) {
    return compact.match(/.{2}/g)!.join(":");
  }
  return "";
}

export type ScanHost = { ip: string; mac: string; hostname: string; name: string };

export function parseNeighborTable(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const ip = line.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/)?.[1];
    if (!ip || !isPrivateIpv4(ip)) continue;
    const colon = line.match(/\b([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})\b/);
    const dash = line.match(/\b([0-9a-fA-F]{2}(?:-[0-9a-fA-F]{2}){5})\b/);
    const mac = normalizeMac((colon?.[1] || dash?.[1] || "").replace(/-/g, ":"));
    if (mac) map.set(ip, mac);
  }
  return map;
}

export function parseScanCidr(input: string) {
  const s = input.trim();
  const m = s.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!m) return { ok: false as const, error: "网段写成 192.168.10.0/24" };
  const ip = m[1];
  const prefix = Number(m[2]);
  if (!isPrivateIpv4(ip)) return { ok: false as const, error: "只扫描内网地址（10/8、172.16/12、192.168/16）" };
  if (prefix < 24 || prefix > 30) return { ok: false as const, error: "一次只扫 /24 到 /30，避免扫太大网段" };
  const sub = calcSubnet(ip, String(prefix));
  if (!sub.ok) return { ok: false as const, error: sub.error };
  const first = ipv4ToInt(sub.firstHost);
  const last = ipv4ToInt(sub.lastHost);
  if (first == null || last == null) return { ok: false as const, error: "网段无效" };
  const hosts: string[] = [];
  for (let n = first; n <= last; n++) hosts.push(intToIpv4(n));
  return { ok: true as const, cidr: `${sub.network}/${sub.prefix}`, prefix: sub.prefix, hosts, network: sub.network };
}

export const COMMON_NET_COMMANDS = [
  { title: "本机地址", win: "ipconfig /all", linux: "ip addr" },
  { title: "清 DNS 缓存", win: "ipconfig /flushdns", linux: "systemd-resolve --flush-caches" },
  { title: "看网关", win: "ipconfig | findstr /i gateway", linux: "ip route" },
  { title: "Ping 网关", win: "ping -n 4 网关IP", linux: "ping -c 4 网关IP" },
  { title: "路由跟踪", win: "tracert 223.5.5.5", linux: "traceroute 223.5.5.5" },
  { title: "查域名", win: "nslookup www.baidu.com", linux: "dig www.baidu.com" },
  { title: "邻居表", win: "arp -a", linux: "ip neigh" },
  { title: "端口占用", win: "netstat -ano | findstr :80", linux: "ss -lntp | grep :80" },
];
