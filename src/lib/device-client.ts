import type { ShopDevice } from "@/lib/auth-shared";
import { guessDeviceFromUa } from "@/lib/auth-shared";

export const DEVICE_STORAGE_KEY = "shop-ui-device";

export function guessDeviceClient(): ShopDevice {
  if (typeof window === "undefined") return "desktop";
  if (guessDeviceFromUa(navigator.userAgent) === "phone") return "phone";
  if (window.matchMedia("(max-width: 767px)").matches) return "phone";
  return "desktop";
}

export function readStoredDevice(): ShopDevice | null {
  try {
    const local = window.localStorage.getItem(DEVICE_STORAGE_KEY);
    if (local === "phone" || local === "desktop") return local;
  } catch {
    /* ignore */
  }
  const m = document.cookie.match(/(?:^|; )shop-device=(phone|desktop)/);
  return m ? (m[1] as ShopDevice) : null;
}

export function persistDeviceLocal(device: ShopDevice) {
  try {
    window.localStorage.setItem(DEVICE_STORAGE_KEY, device);
  } catch {
    /* ignore */
  }
}
