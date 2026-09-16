import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const BASE = "http://192.168.10.104:3010";
const DIR = dirname(fileURLToPath(import.meta.url));

function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/password|enablePassword/i.test(k) && typeof v === "string") out[k] = v ? `[redacted len=${v.length}]` : "";
      else out[k] = redactSecrets(v);
    }
    return out;
  }
  return value;
}

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" })).newPage();
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
if (page.url().includes("/login")) {
  await page.locator("#username").fill("owner");
  await page.locator("#password").fill("123456");
  await page.locator('input[name="device"][value="desktop"]').check();
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/login")),
    page.getByRole("button", { name: "进入系统" }).click(),
  ]);
}

const titles = [];
for (let p = 1; p <= 8; p++) {
  await page.goto(`${BASE}/knowledge?page=${p}`, { waitUntil: "networkidle" });
  const pageTitles = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="/knowledge/"]')].map((a) => ({ href: a.getAttribute("href"), title: a.textContent.trim() })),
  );
  if (!pageTitles.length) break;
  titles.push(...pageTitles);
  const next = await page.getByRole("link", { name: /下一页|后一页/ }).count();
  if (!next && p > 1 && pageTitles.length < 5) break;
}

const withKw = titles.filter((t) => /打印|交换|交换机|VLAN|卡纸/i.test(t.title));

const articles = [];
for (const t of withKw.slice(0, 6)) {
  await page.goto(`${BASE}${t.href}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const textareas = [...document.querySelectorAll("textarea")].map((el, i) => ({ i, len: el.value.length, head: el.value.slice(0, 180), hasMd: /!\[/.test(el.value) }));
    const imgs = [...document.querySelectorAll("img")].map((img) => ({
      alt: img.alt, src: img.getAttribute("src"), nw: img.naturalWidth, nh: img.naturalHeight, broken: img.complete && img.naturalWidth === 0,
    }));
    const body = document.body.innerText;
    return { textareas, imgs, hasImgTag: imgs.length > 0, hasMarkdownVisible: /!\[/.test(body) };
  });
  await page.screenshot({ path: join(DIR, `kb-${t.title.slice(0, 12)}.png`), fullPage: true });
  articles.push({ ...t, ...info });
}

await page.goto(`${BASE}/customers/cmtvno7zt0004tcr2gfr93wmg`, { waitUntil: "networkidle" });
await page.locator("#network").scrollIntoViewIfNeeded();
await page.screenshot({ path: join(DIR, "13-xingchen-network.png"), fullPage: true });
const api = await page.evaluate(async () => {
  const res = await fetch("/api/customers/cmtvno7zt0004tcr2gfr93wmg/network", { credentials: "include" });
  return { status: res.status, json: await res.json() };
});
const xingchen = {
  name: await page.locator("h1").first().innerText(),
  fields: await page.evaluate(() => [...document.querySelector("#network").querySelectorAll("label")].map((l) => l.textContent.trim())),
  apiStatus: api.status,
  json: redactSecrets(api.json),
};

const report = { titleCount: titles.length, titles, withKw, articles, xingchen };
writeFileSync(join(DIR, "report3.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
await browser.close();
