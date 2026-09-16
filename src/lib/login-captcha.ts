import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const CAPTCHA_COOKIE = "shop-login-captcha";
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function secret() {
  return process.env.AUTH_SECRET || "diannaodian-local-auth";
}

export function randomCaptchaCode(len = 4) {
  let s = "";
  for (let i = 0; i < len; i++) s += CHARS[randomInt(CHARS.length)];
  return s;
}

export function signCaptcha(code: string, expMs: number) {
  const payload = `${code.toLowerCase()}.${expMs}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${expMs}.${sig}`;
}

export function verifyCaptcha(token: string | undefined, input: string) {
  const typed = input.trim().toLowerCase();
  if (!token || typed.length < 4) return false;
  const sep = token.indexOf(".");
  if (sep < 1) return false;
  const exp = Number(token.slice(0, sep));
  const sig = token.slice(sep + 1);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expect = createHmac("sha256", secret()).update(`${typed}.${exp}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function captchaCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 5,
  };
}

/** 简易干扰图，不依赖图片库。 */
export function captchaSvg(code: string) {
  const w = 132;
  const h = 44;
  const lines: string[] = [];
  for (let i = 0; i < 5; i++) {
    const x1 = randomInt(w);
    const y1 = randomInt(h);
    const x2 = randomInt(w);
    const y2 = randomInt(h);
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1"/>`);
  }
  const letters = [...code].map((ch, i) => {
    const x = 16 + i * 28;
    const rot = randomInt(24) - 12;
    const y = 30 + randomInt(6) - 3;
    return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-size="22" font-family="ui-monospace,monospace" font-weight="700" fill="#0f172a">${ch}</text>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#f1f5f9"/>${lines.join("")}${letters.join("")}</svg>`;
}
