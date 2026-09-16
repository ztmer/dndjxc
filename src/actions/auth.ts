"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  cookieBase,
  DEVICE_COOKIE,
  deviceCookieBase,
  guessDeviceFromUa,
  hashPassword,
  homeForDevice,
  SESSION_COOKIE,
  signSession,
  type ShopDevice,
} from "@/lib/auth";
import { writeAppLog } from "@/lib/app-log";
import { CAPTCHA_COOKIE, verifyCaptcha } from "@/lib/login-captcha";

export type LoginState = { error: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  const captcha = String(formData.get("captcha") ?? "").trim();
  if (!username || !password) return { error: "请输入账号和密码" };
  if (!captcha) return { error: "请填写验证码" };
  const jar = await cookies();
  const token = jar.get(CAPTCHA_COOKIE)?.value;
  jar.delete(CAPTCHA_COOKIE);
  if (!verifyCaptcha(token, captcha)) return { error: "验证码不对" };
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.passwordHash !== hashPassword(password)) {
    return { error: "账号或密码不对" };
  }
  const h = await headers();
  const device = guessDeviceFromUa(h.get("user-agent") || "");
  jar.set(SESSION_COOKIE, signSession(user.id), cookieBase());
  jar.set(DEVICE_COOKIE, device, deviceCookieBase());
  void writeAppLog({ module: "系统", action: "登录", username: user.username });
  redirect(homeForDevice(device, next));
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function setDeviceAction(device: ShopDevice): Promise<{ ok: true; redirect: string }> {
  const jar = await cookies();
  jar.set(DEVICE_COOKIE, device, deviceCookieBase());
  return { ok: true, redirect: homeForDevice(device) };
}
