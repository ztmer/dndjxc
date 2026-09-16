"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logoutAction, setDeviceAction } from "@/actions/auth";
import { persistDeviceLocal } from "@/lib/device-client";
import type { ShopDevice } from "@/lib/auth-shared";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={pending}
      onClick={() => {
        start(async () => {
          await logoutAction();
          router.replace("/login");
          router.refresh();
        });
      }}
    >
      退出
    </Button>
  );
}

export function SwitchShellButton({
  device,
  label,
  className,
}: {
  device: ShopDevice;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={pending}
      onClick={() => {
        persistDeviceLocal(device);
        start(async () => {
          const r = await setDeviceAction(device);
          router.replace(r.redirect);
          router.refresh();
        });
      }}
    >
      {label}
    </Button>
  );
}
