import { createHash, createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "shop-session";

function secret() {
  return process.env.AUTH_SECRET || "diannaodian-local-auth";
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function signSession(userId: string) {
  const sig = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

export function readSessionUserId(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 1) return null;
  const id = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expect = createHmac("sha256", secret()).update(id).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return id;
}
