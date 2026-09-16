export type ShopUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  canSeeCost: boolean;
};

export type ShopDevice = "phone" | "desktop";

export function parseDevice(raw: string | null | undefined): ShopDevice | null {
  if (raw === "phone" || raw === "desktop") return raw;
  return null;
}

export function guessDeviceFromUa(ua: string): ShopDevice {
  if (/iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "phone";
  if (/Android/i.test(ua) && !/Tablet|Pad/i.test(ua)) return "phone";
  if (/Mobile/i.test(ua) && !/iPad/i.test(ua)) return "phone";
  return "desktop";
}

export function homeForDevice(device: ShopDevice, next?: string | null) {
  const raw = (next || "").trim();
  const safe = raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") ? raw : "";
  if (device === "phone") {
    if (safe.startsWith("/m")) return safe;
    if (safe.startsWith("/customers")) return `/m${safe}`;
    if (safe.startsWith("/work-orders")) return `/m${safe}`;
    if (safe.startsWith("/builds")) return `/m${safe}`;
    if (safe.startsWith("/serials")) return `/m${safe}`;
    if (safe.startsWith("/knowledge")) return `/m${safe}`;
    if (safe.startsWith("/receipts")) return `/m${safe}`;
    if (safe.startsWith("/products") && !safe.startsWith("/products/categories") && !safe.startsWith("/products/brands")) return `/m${safe}`;
    return "/m";
  }
  if (safe.startsWith("/m")) return safe.slice(2) || "/";
  if (safe && safe !== "/login") return safe;
  return "/";
}

export function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname === "/api/login-captcha" || pathname === "/api/company-brand/logo";
}

export function userCanSeeCost(user: { role: string; canSeeCost: boolean }) {
  return user.role === "owner" || user.canSeeCost;
}
