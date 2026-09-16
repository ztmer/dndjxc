import { createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const DIR = join(process.cwd(), "public", "product-images");

function fallbackSvg(code: string, brand: string, name: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const title = esc((brand ? `${brand} ` : "") + name).slice(0, 40);
  const sub = esc(code);
  let h = 0;
  for (const c of brand || code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pal = ["#2563eb", "#0f766e", "#b45309", "#7c3aed", "#be123c", "#0369a1", "#15803d", "#c2410c"];
  const accent = pal[h % pal.length];
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#f8fafc"/>
  <rect x="56" y="48" width="528" height="384" rx="28" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="56" y="48" width="528" height="72" rx="28" fill="${accent}"/>
  <rect x="56" y="88" width="528" height="32" fill="${accent}"/>
  <text x="320" y="92" text-anchor="middle" font-size="20" font-family="Microsoft YaHei, PingFang SC, sans-serif" fill="#ffffff">${esc(brand || "电脑店")}</text>
  <rect x="250" y="150" width="140" height="100" rx="16" fill="#f1f5f9" stroke="${accent}" stroke-width="3"/>
  <text x="320" y="290" text-anchor="middle" font-size="22" font-family="Microsoft YaHei, PingFang SC, sans-serif" fill="#0f172a">${title}</text>
  <text x="320" y="328" text-anchor="middle" font-size="14" font-family="Consolas, monospace" fill="#64748b">${sub}</text>
  <text x="320" y="400" text-anchor="middle" font-size="13" font-family="Microsoft YaHei, PingFang SC, sans-serif" fill="#94a3b8">产品目录示意图</text>
</svg>`;
}

async function tryDownload(url: string, dest: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: new URL(url).origin + "/",
      },
    });
    if (!res.ok || !res.body) return false;
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("text/html")) return false;
    mkdirSync(dirname(dest), { recursive: true });
    await pipeline(Readable.fromWeb(res.body as unknown as import("stream/web").ReadableStream), createWriteStream(dest));
    return existsSync(dest) && statSync(dest).size > 2000;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** 下载主图到 public/product-images/{code}.(jpg|png|webp|svg)，返回站点路径。 */
export async function ensureProductImage(code: string, brand: string, name: string, urls: string[]) {
  mkdirSync(DIR, { recursive: true });
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const existing = join(DIR, `${code}.${ext}`);
    if (existsSync(existing) && statSync(existing).size > 2000) {
      return `/product-images/${code}.${ext}`;
    }
  }
  const svgExisting = join(DIR, `${code}.svg`);
  if (existsSync(svgExisting) && statSync(svgExisting).size > 400) {
    return `/product-images/${code}.svg`;
  }
  for (const url of urls) {
    const lower = url.toLowerCase();
    const ext = lower.includes(".png") ? "png" : lower.includes(".webp") ? "webp" : "jpg";
    const dest = join(DIR, `${code}.${ext}`);
    const ok = await tryDownload(url, dest);
    if (ok) return `/product-images/${code}.${ext}`;
    try {
      if (existsSync(dest) && statSync(dest).size < 2000) {
        writeFileSync(dest, "");
      }
    } catch {
      /* ignore */
    }
  }
  const svg = join(DIR, `${code}.svg`);
  writeFileSync(svg, fallbackSvg(code, brand, name));
  return `/product-images/${code}.svg`;
}
