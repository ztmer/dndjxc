"use client";

import { Suspense, useEffect, useState } from "react";
import { PanelLeftIcon } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { HeaderSearch } from "@/components/header-search";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmbedPathSync } from "@/components/embed-path-sync";
import { WorkspaceTabs } from "@/components/workspace-tabs";
import { usePathname } from "next/navigation";
import { tabTitle } from "@/lib/tab-title";
import { UiSchemeProvider, useUiScheme } from "@/components/ui-scheme-provider";
import { UiSchemeSwitch } from "@/components/ui-scheme-switch";
import { CounterChrome } from "@/components/counter-chrome";
import { AuthDeviceGate } from "@/components/auth-device-gate";
import { MobileChrome } from "@/components/mobile-chrome";
import { LogoutButton, SwitchShellButton } from "@/components/session-buttons";
import type { ShopDevice, ShopUser } from "@/lib/auth-shared";
import type { SiteBrand } from "@/lib/site-brand";

const NAV_KEY = "shop-nav-open";

export function ShopShell({
  children,
  embed,
  user,
  device,
  brand,
}: {
  children: React.ReactNode;
  embed?: boolean;
  user: ShopUser | null;
  device: ShopDevice | null;
  brand: SiteBrand;
}) {
  return (
    <UiSchemeProvider>
      <ShopShellInner embed={embed} user={user} device={device} brand={brand}>
        {children}
      </ShopShellInner>
    </UiSchemeProvider>
  );
}

function ShopShellInner({
  children,
  embed,
  user,
  device,
  brand,
}: {
  children: React.ReactNode;
  embed?: boolean;
  user: ShopUser | null;
  device: ShopDevice | null;
  brand: SiteBrand;
}) {
  const pathname = usePathname();
  const { scheme } = useUiScheme();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (window.localStorage.getItem(NAV_KEY) === "0") setOpen(false);
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(NAV_KEY, next ? "1" : "0");
      return next;
    });
  }

  const gate = embed ? null : <AuthDeviceGate user={user} cookieDevice={device} />;

  if (pathname.startsWith("/print") || /\/report-formats\/[^/]+\/preview$/.test(pathname)) {
    return (
      <TooltipProvider>
        {gate}
        <div className="min-h-svh overflow-auto bg-white text-black">{children}</div>
        <Toaster />
      </TooltipProvider>
    );
  }

  if (pathname === "/login") {
    return (
      <TooltipProvider>
        {gate}
        <div className="h-full overflow-y-auto overscroll-contain">{children}</div>
        <Toaster />
      </TooltipProvider>
    );
  }

  if (!embed && !user) {
    return (
      <TooltipProvider>
        {gate}
        <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">正在进入登录…</div>
        <Toaster />
      </TooltipProvider>
    );
  }

  if (embed) {
    return (
      <TooltipProvider>
        <Suspense fallback={null}>
          <EmbedPathSync />
        </Suspense>
        <div className="flex min-h-full w-full max-w-[1080px] flex-col gap-5 p-6">{children}</div>
        <Toaster />
      </TooltipProvider>
    );
  }

  if (pathname.startsWith("/m")) {
    return (
      <TooltipProvider>
        {gate}
        <MobileChrome user={user}>{children}</MobileChrome>
        <Toaster />
      </TooltipProvider>
    );
  }

  const tools = (
    <>
      <UiSchemeSwitch />
      <SwitchShellButton device="phone" label="手机版" className="h-9" />
      <LogoutButton className="h-9" />
      <HeaderSearch />
    </>
  );

  if (scheme === "counter") {
    return (
      <TooltipProvider>
        {gate}
        <CounterChrome
          brand={brand}
          extra={
            <>
              <SwitchShellButton device="phone" label="手机版" className="h-9" />
              <LogoutButton className="h-9" />
            </>
          }
        >
          {children}
        </CounterChrome>
        <Toaster />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      {gate}
      <div className="flex h-svh overflow-hidden">
        {open ? <AppNav onHide={toggle} siteTitle={brand.title} logoSrc={brand.logoSrc} /> : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-[52px] shrink-0 items-center gap-3 border-b bg-card px-5">
            {open ? null : (
              <button
                type="button"
                aria-label="显示菜单"
                className="flex size-8 shrink-0 items-center justify-center rounded border bg-background hover:bg-muted"
                onClick={toggle}
              >
                <PanelLeftIcon className="size-4" />
              </button>
            )}
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{tabTitle(pathname)}</p>
            {tools}
          </header>
          <WorkspaceTabs>{children}</WorkspaceTabs>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
