import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "http://192.168.10.104:3010";
const DIR = dirname(fileURLToPath(import.meta.url));
mkdirSync(DIR, { recursive: true });

const bugs = [];
const notes = [];
function bug(title, evidence) {
  bugs.push({ title, evidence });
}
function note(title, detail) {
  notes.push({ title, detail });
}

function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (/password|enablePassword/i.test(k) && typeof v === "string") {
        out[k] = v ? `[redacted len=${v.length}]` : "";
      } else {
        out[k] = redactSecrets(v);
      }
    }
    return out;
  }
  return value;
}

function collectKeys(value, prefix = "") {
  const keys = [];
  if (Array.isArray(value)) {
    keys.push(prefix || "[]");
    if (value[0] && typeof value[0] === "object") {
      keys.push(...collectKeys(value[0], prefix ? `${prefix}[]` : "[]"));
    }
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

async function inspectImages(page, where) {
  return page.evaluate((where) => {
    const imgs = [...document.querySelectorAll("img")];
    return imgs.map((img, i) => ({
      where,
      index: i,
      alt: img.alt || "",
      src: img.currentSrc || img.getAttribute("src") || "",
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      broken: img.complete && img.naturalWidth === 0,
      displayed: img.getBoundingClientRect().width > 0 && getComputedStyle(img).display !== "none",
    }));
  }, where);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  if (!page.url().includes("/login")) {
    note("login", `already authenticated, redirected to ${page.url()}`);
    return;
  }
  await page.locator("#username").fill("owner");
  await page.locator("#password").fill("123456");
  await page.locator('input[name="device"][value="desktop"]').check();
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 }),
    page.getByRole("button", { name: "进入系统" }).click(),
  ]);
}

async function knowledgePass(page, shotName) {
  await page.goto(`${BASE}/knowledge`, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(DIR, `${shotName}-list.png`), fullPage: true });

  const search = page.locator('input[name="q"]');
  await search.fill("打印机");
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.getByRole("button", { name: "搜索" }).click(),
  ]);

  let links = page.locator('a[href^="/knowledge/"]');
  let count = await links.count();
  let queryUsed = "打印机";
  if (count === 0) {
    await search.fill("交换机");
    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.getByRole("button", { name: "搜索" }).click(),
    ]);
    links = page.locator('a[href^="/knowledge/"]');
    count = await links.count();
    queryUsed = "交换机";
  }
  if (count === 0) {
    await page.goto(`${BASE}/knowledge`, { waitUntil: "networkidle" });
    links = page.locator('a[href^="/knowledge/"]');
    count = await links.count();
    queryUsed = "(全部列表，搜索无命中)";
  }

  const titles = [];
  for (let i = 0; i < Math.min(count, 12); i++) {
    titles.push(((await links.nth(i).innerText()) || "").trim());
  }
  const prefer = titles.findIndex((t) => /打印|交换机|交换|printer|switch/i.test(t));
  const pick = prefer >= 0 ? prefer : 0;
  if (count === 0) {
    bug("知识库没有可打开的文章", { queryUsed, url: page.url() });
    return { queryUsed, title: null, href: null, images: [] };
  }

  const href = await links.nth(pick).getAttribute("href");
  const title = titles[pick];
  await Promise.all([page.waitForLoadState("networkidle"), links.nth(pick).click()]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(DIR, `${shotName}-article.png`), fullPage: true });
  const images = await inspectImages(page, `knowledge:${title}`);
  const broken = images.filter((img) => img.broken);
  if (broken.length) bug("知识库文章图片损坏", { title, href, broken });
  note("knowledge", { queryUsed, title, href, imageCount: images.length, brokenCount: broken.length, images });
  return { queryUsed, title, href, images };
}

async function customerPass(page, shotName) {
  await page.goto(`${BASE}/customers`, { waitUntil: "networkidle" });
  await page.screenshot({ path: join(DIR, `${shotName}-list.png`), fullPage: true });

  const chosen = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("tbody tr")];
    const parsed = rows.map((row) => {
      const link = row.querySelector('a[href^="/customers/"]');
      const name = (row.querySelectorAll("td")[1]?.innerText || "").trim();
      const walkIn = /散客/.test(row.innerText);
      return { href: link?.getAttribute("href") || "", name, walkIn };
    });
    const unit = parsed.find((r) => r.href && !r.walkIn);
    return unit || parsed.find((r) => r.href) || null;
  });
  if (!chosen) {
    bug("客户列表没有可打开的客户", { url: page.url() });
    return { customer: null, fields: [], json: null };
  }

  await page.goto(`${BASE}${chosen.href}`, { waitUntil: "networkidle" });
  const network = page.locator("#network");
  const networkVisible = await network.count();
  if (!networkVisible) bug("客户详情缺少 #network 网络资料区块", { customer: chosen });
  else {
    await network.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: join(DIR, `${shotName}-network.png`), fullPage: true });

  const fields = await page.evaluate(() => {
    const root = document.querySelector("#network");
    if (!root) return { missing: true, headings: [], labels: [], cards: [] };
    const headings = [...root.querySelectorAll("h2,h3,[data-slot='card-title']")].map((el) => el.textContent.trim());
    const labels = [...root.querySelectorAll("label")].map((el) => el.textContent.trim()).filter(Boolean);
    const cards = [...root.querySelectorAll("[data-slot='card-title'], .font-semibold")].map((el) => el.textContent.trim());
    return {
      missing: false,
      h2: root.querySelector("h2")?.textContent?.trim() || "",
      headings: [...new Set(headings)],
      labels: [...new Set(labels)],
      cards: [...new Set(cards)],
      textSample: root.innerText.slice(0, 2500),
    };
  });

  const id = chosen.href.split("/").filter(Boolean).pop();
  const api = await page.evaluate(async (id) => {
    const res = await fetch(`/api/customers/${id}/network`, { credentials: "include" });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { parseError: true, text: text.slice(0, 500) };
    }
    return { status: res.status, json };
  }, id);

  if (api.status !== 200) {
    bug("GET /api/customers/{id}/network 非 200", { id, status: api.status, json: redactSecrets(api.json) });
  }

  note("customer", { chosen, fields, apiStatus: api.status, jsonKeys: collectKeys(api.json) });
  return { customer: chosen, id, fields, json: redactSecrets(api.json), keys: collectKeys(api.json), status: api.status };
}

async function toolsPass(page, shotName) {
  await page.goto(`${BASE}/network/tools`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(DIR, `${shotName}-tools.png`), fullPage: true });
  const ui = await page.evaluate(() => {
    const titles = [...document.querySelectorAll("h1,h2,h3,[data-slot='card-title']")].map((el) => el.textContent.trim());
    const buttons = [...document.querySelectorAll("button")].map((el) => el.textContent.trim()).filter(Boolean);
    const labels = [...document.querySelectorAll("label")].map((el) => el.textContent.trim()).filter(Boolean);
    const body = document.body.innerText;
    return {
      url: location.href,
      titles,
      buttons,
      labels,
      hasPing: /Ping/.test(body) && buttons.includes("Ping"),
      hasDns: buttons.includes("DNS 查询"),
      hasSubnet: /子网计算/.test(body),
      hasCalc: buttons.includes("计算"),
      pingPlaceholder: document.querySelector('input[placeholder*="192.168"]')?.getAttribute("placeholder") || "",
      visibleText: body.slice(0, 1800),
    };
  });
  if (!ui.hasPing) bug("网络工具页缺少 Ping 按钮/区块", ui);
  if (!ui.hasSubnet) bug("网络工具页缺少子网计算 UI", ui);
  note("tools", ui);
  return ui;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "zh-CN" });
const page = await context.newPage();
const consoleErrors = [];
page.on("pageerror", (err) => consoleErrors.push(String(err)));
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

try {
  await login(page);
  await page.screenshot({ path: join(DIR, "01-after-login.png"), fullPage: true });

  const k1 = await knowledgePass(page, "02-knowledge");
  const c1 = await customerPass(page, "03-customer");
  const t1 = await toolsPass(page, "04-tools");

  const k2 = await knowledgePass(page, "05-knowledge-repeat");
  const c2 = await customerPass(page, "06-customer-repeat");
  const t2 = await toolsPass(page, "07-tools-repeat");

  const report = {
    ok: bugs.length === 0,
    bugs,
    notes,
    consoleErrors,
    pass1: { knowledge: k1, customer: { ...c1, json: c1.json }, tools: t1 },
    pass2: { knowledge: k2, customer: { ...c2, json: c2.json }, tools: t2 },
  };
  writeFileSync(join(DIR, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
