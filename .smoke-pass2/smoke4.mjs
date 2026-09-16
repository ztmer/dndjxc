import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const BASE = "http://192.168.10.104:3010";
const DIR = dirname(fileURLToPath(import.meta.url));

function pickImgs() {
  return [...document.querySelectorAll("img")].map((img) => ({
    alt: img.alt,
    src: img.getAttribute("src"),
    complete: img.complete,
    nw: img.naturalWidth,
    nh: img.naturalHeight,
    broken: img.complete && img.naturalWidth === 0,
  }));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const page = await context.newPage();
const checks = [];

function add(id, pass, url, detail) {
  checks.push({ id, pass, url, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} ${url} ${JSON.stringify(detail)}`);
}

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
add("login", !page.url().includes("/login"), page.url(), { afterLogin: page.url() });

async function searchSanCeng(round) {
  const url = `${BASE}/knowledge?q=${encodeURIComponent("三层")}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => {
    const items = [...document.querySelectorAll('a[href^="/knowledge/"]')].map((a) => ({
      href: a.getAttribute("href"),
      title: a.textContent.trim(),
    }));
    const empty = document.body.innerText.includes("没有匹配的条目");
    return { items, empty, title: document.title, h1: document.querySelector("h1")?.textContent?.trim() };
  });
  const hit = result.items.find((t) => /三层交换机/.test(t.title));
  add(`search-三层-round${round}`, !!hit, url, {
    hitTitle: hit?.title ?? null,
    hitHref: hit?.href ?? null,
    empty: result.empty,
    titles: result.items.map((t) => t.title),
  });
  return hit;
}

const hit1 = await searchSanCeng(1);
const hit2 = await searchSanCeng(2);

async function inspectArticle(id, href, expectSrc) {
  if (!href) {
    add(id, false, `${BASE}/knowledge`, { reason: "search did not return href" });
    return null;
  }
  const url = `${BASE}${href}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].map((img) => ({
      alt: img.alt,
      src: img.getAttribute("src"),
      complete: img.complete,
      nw: img.naturalWidth,
      nh: img.naturalHeight,
      broken: img.complete && img.naturalWidth === 0,
    }));
    const textareas = [...document.querySelectorAll("textarea")].map((el) => ({
      head: el.value.slice(0, 220),
      hasMd: /!\[[^\]]*\]\([^)]+\)/.test(el.value),
      mdSrc: [...el.value.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]),
    }));
    return {
      pageTitle: document.title,
      h1: document.querySelector("h1")?.textContent?.trim(),
      imgs,
      textareas,
      hasImgTag: imgs.length > 0,
    };
  });
  const srcOk = info.imgs.some((img) => (img.src || "").includes(expectSrc));
  const loaded = info.imgs.some((img) => (img.src || "").includes(expectSrc) && !img.broken && img.nw > 0);
  add(id, srcOk && loaded, url, {
    expectSrc,
    srcOk,
    loaded,
    h1: info.h1,
    imgs: info.imgs,
    mdSrc: info.textareas.flatMap((t) => t.mdSrc),
  });
  const shot = join(DIR, `pass3-${id}.png`);
  await page.screenshot({ path: shot, fullPage: true });
  return { ...info, url, shot };
}

const switchHref = hit1?.href || hit2?.href;
const switchArt = await inspectArticle("article-三层交换机", switchHref, "/knowledge/switch-3layer.svg");

await page.goto(`${BASE}/knowledge?q=${encodeURIComponent("脱机")}`, { waitUntil: "networkidle" });
const printerHit = await page.evaluate(() => {
  const items = [...document.querySelectorAll('a[href^="/knowledge/"]')].map((a) => ({
    href: a.getAttribute("href"),
    title: a.textContent.trim(),
  }));
  return items.find((t) => /打印机/.test(t.title) && /脱机/.test(t.title)) || items.find((t) => /脱机/.test(t.title)) || null;
});
add("search-脱机", !!printerHit, `${BASE}/knowledge?q=${encodeURIComponent("脱机")}`, printerHit);
const printerArt = await inspectArticle("article-打印机脱机", printerHit?.href, "/knowledge/printer-paper-path.svg");

const staticFiles = [];
for (const path of ["/knowledge/switch-3layer.svg", "/knowledge/printer-paper-path.svg"]) {
  const res = await page.request.get(`${BASE}${path}`);
  const body = await res.text();
  staticFiles.push({ path, status: res.status(), contentType: res.headers()["content-type"], len: body.length, svg: body.includes("<svg") });
  add(`static-${path}`, res.status() === 200 && body.includes("<svg"), `${BASE}${path}`, {
    status: res.status(),
    contentType: res.headers()["content-type"],
    len: body.length,
  });
}

const initRes = await page.goto(`${BASE}/settings/init`, { waitUntil: "networkidle" });
const initStatus = initRes?.status() ?? page.url();
const initOk = initStatus === 200 && !page.url().includes("/login");
const initText = await page.locator("h1").first().innerText().catch(() => "");
add("settings-init", initOk, page.url(), { httpStatus: initStatus, h1: initText });

const toolsRes = await page.goto(`${BASE}/network/tools`, { waitUntil: "networkidle" });
const toolsStatus = toolsRes?.status() ?? 0;
const toolsOk = toolsStatus === 200 && !page.url().includes("/login");
const toolsH1 = await page.locator("h1").first().innerText().catch(() => "");
const toolsButtons = await page.evaluate(() =>
  [...document.querySelectorAll("button, a")].slice(0, 20).map((el) => el.textContent.trim()).filter(Boolean),
);
add("network-tools", toolsOk, page.url(), { httpStatus: toolsStatus, h1: toolsH1, buttons: toolsButtons });
await page.screenshot({ path: join(DIR, "pass3-network-tools.png"), fullPage: true });

const summary = {
  allPass: checks.every((c) => c.pass),
  checks,
  switchArt: switchArt ? { url: switchArt.url, imgs: switchArt.imgs } : null,
  printerArt: printerArt ? { url: printerArt.url, imgs: printerArt.imgs } : null,
  staticFiles,
};
writeFileSync(join(DIR, "report4.json"), JSON.stringify(summary, null, 2), "utf8");
console.log("---SUMMARY---");
console.log(JSON.stringify({ allPass: summary.allPass, checks: checks.map((c) => ({ id: c.id, pass: c.pass, url: c.url })) }, null, 2));
await browser.close();
process.exit(summary.allPass ? 0 : 1);
