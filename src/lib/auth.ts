import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parseDevice, type ShopDevice, type ShopUser } from "@/lib/auth-shared";
import { hashPassword, readSessionUserId, SESSION_COOKIE, signSession } from "@/lib/auth-crypto";

export const DEVICE_COOKIE = "shop-device";

export type { ShopDevice, ShopUser };
export { parseDevice, guessDeviceFromUa, homeForDevice, isPublicPath } from "@/lib/auth-shared";
export { hashPassword, readSessionUserId, SESSION_COOKIE, signSession };

export async function getSessionUser(): Promise<ShopUser | null> {
  const jar = await cookies();
  const id = readSessionUserId(jar.get(SESSION_COOKIE)?.value);
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, displayName: true, role: true, canSeeCost: true },
  });
}

export async function getDeviceCookie(): Promise<ShopDevice | null> {
  const jar = await cookies();
  return parseDevice(jar.get(DEVICE_COOKIE)?.value);
}

export function cookieBase() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    expires: new Date(Date.now() + 60 * 60 * 24 * 30 * 1000),
  };
}

export function deviceCookieBase() {
  return {
    httpOnly: false as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    expires: new Date(Date.now() + 60 * 60 * 24 * 365 * 1000),
  };
}
