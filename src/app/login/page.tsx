import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { SiteBrandMark } from "@/components/site-brand-mark";
import { getDeviceCookie, getSessionUser, guessDeviceFromUa, homeForDevice } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteBrand } from "@/lib/site-brand";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const h = await headers();
  const { next, reason } = await searchParams;
  const [user, device, brand, site] = await Promise.all([
    getSessionUser(),
    getDeviceCookie(),
    getSiteBrand(),
    prisma.siteSetting.findUnique({ where: { id: "default" } }).catch(() => null),
  ]);
  if (user) {
    const fallback = guessDeviceFromUa(h.get("user-agent") || "");
    redirect(homeForDevice(device ?? fallback, next));
  }
  const hint = site?.loginHint?.trim() || site?.subtitle?.trim() || "";
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-[400px] rounded-xl border bg-card p-5 shadow-sm md:p-8">
        <div className="mb-5">
          <SiteBrandMark title={brand.title} logoSrc={brand.logoSrc} size="lg" />
          {hint ? <p className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
        </div>
        <LoginForm next={next} expired={reason === "expired"} />
      </div>
    </div>
  );
}
