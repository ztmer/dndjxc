import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://192.168.10.104:3010";
const DIR = dirname(fileURLToPath(import.meta.url));
mkdirSync(DIR, { recursive: true });

function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/password|enablePassword/i.test(k) && typeof v === "string") {
        out[k] = v ? `[redacted len=${v.length}]` : "";
      } else out[k] = redactSecrets(v);
    }
    return out;
  }
  return value;
}

function collectKeys(value, prefix = "") {
  const keys = [];
  if (Array.isArray(value)) {
    if (value[0] && typeof value[0] === "object") keys.push(...collectKeys(value[0], prefix ? `${prefix}[]` : "[]"));
    return keys;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${k}` : k;
      keys.push(path);
      if (v && typeof v === "object") keys.push(...collectKeys(v, path));
    }
  }
  return keys;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const page = await context.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
if (page.url().includes("/login")) {
  await page.locator("#username").fill("owner");
  await page.locator("#password").fill("123456");
  await page.locator('input[name="device"][value="desktop"]').check();
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 }),
    page.getByRole("button", { name: "进入系统" }).click(),
  ]);
}

async function inspectArticle(q, titlePart, shot) {
  await page.goto(`${BASE}/knowledge?q=${encodeURIComponent(q)}`, { waitUntil: "networkidle" });
  const link = page.locator(`a[href^="/knowledge/"]`, { hasText: titlePart }).first();
  const found = (await link.count()) > 0;
  if (!found) return { q, titlePart, found: false };
  const href = await link.getAttribute("href");
  const title = (await link.innerText()).trim();
  await Promise.all([page.waitForLoadState("networkidle"), link.click()]);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(DIR, shot), fullPage: true });
  const data = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("[data-slot='card']")];
    const solutionCard = cards.find((c) => /解决办法/.test(c.innerText));
    const imgs = [...document.querySelectorAll("img")].map((img) => ({
      alt: img.alt,
      src: img.getAttribute("src"),
      currentSrc: img.currentSrc,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      broken: img.complete && img.naturalWidth === 0,
    }));
    const solutionText = solutionCard ? solutionCard.innerText : "";
    const solutionHtml = solutionCard ? solutionCard.innerHTML.slice(0, 4000) : "";
    const textarea = document.querySelector("textarea");
    const formSolution = textarea ? textarea.value : "";
    return { solutionText, solutionHtml, formSolution, imgs, hasMarkdown: /!\[/.test(formSolution + solutionText) };
  });
  return { q, titlePart, found: true, href, title, ...data };
}

const printerOffline = await inspectArticle("打印机", "打印机脱机", "08-printer-offline.png");
const printerJam = await inspectArticle("打印机", "卡纸", "09-printer-jam.png");
const sw = await inspectArticle("交换机", "三层交换机", "10-switch.png");

const staticFiles = [];
for (const path of [
  "/knowledge/printer-paper-path.svg",
  "/knowledge/switch-3layer.svg",
  "/knowledge/ip-segments.svg",
  "/product-images/PRT-L3251.svg",
]) {
  const res = await page.evaluate(async (path) => {
    const r = await fetch(path, { credentials: "include" });
    const text = await r.text();
    return { path, status: r.status, contentType: r.headers.get("content-type"), starts: text.slice(0, 80), len: text.length };
  }, path);
  staticFiles.push(res);
}

await page.goto(`${BASE}/customers`, { waitUntil: "networkidle" });
const customers = await page.evaluate(() =>
  [...document.querySelectorAll("tbody tr")].map((row) => {
    const tds = [...row.querySelectorAll("td")].map((td) => td.innerText.trim());
    const link = row.querySelector('a[href^="/customers/"]');
    return {
      href: link?.getAttribute("href") || "",
      code: tds[0],
      name: tds[1],
      walkIn: /散客/.test(row.innerText),
    };
  }),
);
const unit = customers.find((c) => c.href && !c.walkIn && !/关卡C/.test(c.name)) || customers.find((c) => c.href && !c.walkIn);

let customerDetail = null;
if (unit) {
  await page.goto(`${BASE}${unit.href}`, { waitUntil: "networkidle" });
  await page.locator("#network").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(DIR, "11-unit-customer-network.png"), fullPage: true });
  const id = unit.href.split("/").filter(Boolean).pop();
  const api = await page.evaluate(async (id) => {
    const res = await fetch(`/api/customers/${id}/network`, { credentials: "include" });
    return { status: res.status, json: await res.json() };
  }, id);
  const fields = await page.evaluate(() => {
    const root = document.querySelector("#network");
    const labels = [...root.querySelectorAll("label")].map((el) => el.textContent.trim());
    return { h2: root.querySelector("h2")?.textContent, labels: [...new Set(labels)], text: root.innerText.slice(0, 2000) };
  });
  customerDetail = {
    unit,
    fields,
    apiStatus: api.status,
    keys: ["customer", "sites", "accounts", "devices", "ips"],
    nestedKeys: collectKeys(api.json),
    json: redactSecrets(api.json),
    counts: {
      sites: api.json.sites?.length,
      accounts: api.json.accounts?.length,
      devices: api.json.devices?.length,
      ips: api.json.ips?.length,
    },
  };
}

await page.goto(`${BASE}/network/tools`, { waitUntil: "networkidle" });
await page.screenshot({ path: join(DIR, "12-tools.png"), fullPage: true });
const tools = await page.evaluate(() => ({
  ping: !!document.querySelector("button") && /Ping/.test(document.body.innerText),
  subnet: /子网计算/.test(document.body.innerText),
  defaultIp: [...document.querySelectorAll("input")].map((i) => i.value),
}));

const report = { printerOffline, printerJam, sw, staticFiles, customers, customerDetail, tools };
writeFileSync(join(DIR, "report2.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
await browser.close();
