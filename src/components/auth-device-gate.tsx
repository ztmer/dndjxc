"use client";

import { useEffect, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setDeviceAction } from "@/actions/auth";
import { homeForDevice, isPublicPath, type ShopDevice, type ShopUser } from "@/lib/auth-shared";
import { guessDeviceClient, persistDeviceLocal, readStoredDevice } from "@/lib/device-client";

export function AuthDeviceGate({
  user,
  cookieDevice,
}: {
  user: ShopUser | null;
  cookieDevice: ShopDevice | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [, start] = useTransition();

  useEffect(() => {
    if (isPublicPath(pathname)) return;
    if (!user) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
      return;
    }
    const stored = cookieDevice ?? readStoredDevice();
    const device = stored ?? guessDeviceClient();
    persistDeviceLocal(device);
    if (!cookieDevice) {
      start(async () => {
        await setDeviceAction(device);
      });
    }
    if (device === "phone" && !pathname.startsWith("/m")) {
      router.replace(homeForDevice("phone", pathname));
      return;
    }
    if (device === "desktop" && pathname.startsWith("/m")) {
      router.replace(homeForDevice("desktop", pathname));
    }
  }, [user, cookieDevice, pathname, router]);

  return null;
}
