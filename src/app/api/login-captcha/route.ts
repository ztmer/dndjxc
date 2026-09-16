import { cookies } from "next/headers";
import { captchaCookieOptions, captchaSvg, randomCaptchaCode, signCaptcha, CAPTCHA_COOKIE } from "@/lib/login-captcha";

export const dynamic = "force-dynamic";

export async function GET() {
  const code = randomCaptchaCode();
  const exp = Date.now() + 5 * 60 * 1000;
  const jar = await cookies();
  jar.set(CAPTCHA_COOKIE, signCaptcha(code, exp), captchaCookieOptions());
  return new Response(captchaSvg(code), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
