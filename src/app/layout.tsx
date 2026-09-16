import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { ShopShell } from "@/components/shop-shell";
import { getDeviceCookie, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maybeAutoMaintain } from "@/lib/db-backup";
import { getSiteBrand } from "@/lib/site-brand";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const site = await prisma.siteSetting.findUnique({ where: { id: "default" } });
    return {
      title: site?.title?.trim() || "电脑店系统",
      description: site?.subtitle?.trim() || "客户时间线 · 工单 · 串号保修 · 门店仓",
      appleWebApp: {
        capable: true,
        title: site?.title?.trim() || "电脑店",
        statusBarStyle: "black-translucent",
      },
      other: { "mobile-web-app-capable": "yes" },
    };
  } catch {
    return { title: "电脑店系统" };
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
  themeColor: "#000000",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const h = await headers();
  const embed = h.get("sec-fetch-dest") === "iframe" || h.get("x-shop-embed") === "1";
  const [user, device, brand] = embed
    ? [null, null, await getSiteBrand()]
    : await Promise.all([getSessionUser(), getDeviceCookie(), getSiteBrand()]);
  if (user) void maybeAutoMaintain();
  return (
    <html lang="zh-CN" suppressHydrationWarning data-ui="office" className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}>
      <body className={embed ? "min-h-full font-sans" : "h-dvh overflow-hidden font-sans"}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("shop-ui-scheme");if(s==="counter"||s==="office")document.documentElement.setAttribute("data-ui",s);}catch(e){}})();`,
          }}
        />
        <ShopShell embed={embed} user={user} device={device} brand={brand}>
          {children}
        </ShopShell>
      </body>
    </html>
  );
}
