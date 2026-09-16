import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import type { ShopUser } from "@/lib/auth-shared";

export async function requireSession(nextPath: string): Promise<ShopUser> {
  const user = await getSessionUser();
  if (!user) {
    const next = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return user;
}

export async function requireActionUser(): Promise<
  { ok: true; user: ShopUser } | { ok: false; error: string }
> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "请重新登录" };
  return { ok: true, user };
}

export async function assertLoggedIn(): Promise<ShopUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("请重新登录");
  return user;
}

export async function assertOwner(): Promise<ShopUser> {
  const user = await assertLoggedIn();
  if (user.role !== "owner") throw new Error("只有店主能做这项操作");
  return user;
}
