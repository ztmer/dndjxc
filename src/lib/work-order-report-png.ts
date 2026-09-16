import fs from "fs/promises";
import path from "path";
import { Resvg } from "@resvg/resvg-js";

function esc(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const FONT_CANDIDATES = [
  path.join(process.cwd(), "data", "fonts", "NotoSansSC-Regular.otf"),
  "C:\\Windows\\Fonts\\msyh.ttc",
  "C:\\Windows\\Fonts\\msyhbd.ttc",
  "C:\\Windows\\Fonts\\simhei.ttf",
  "C:\\Windows\\Fonts\\simsun.ttc",
  "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
  "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
];

const FONT_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@Sans2.004/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf";

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function resolveCjkFont(): Promise<string | null> {
  for (const p of FONT_CANDIDATES) {
    if (await fileExists(p)) return p;
  }
  const dest = FONT_CANDIDATES[0]!;
  try {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    const res = await fetch(FONT_URL);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 10000) return null;
    await fs.writeFile(dest, buf);
    return dest;
  } catch {
    return null;
  }
}

export type WorkOrderReport = {
  shop: string;
  shopPhone: string;
  title: string;
  docNo: string;
  status: string;
  customer: string;
  phone: string;
  address: string;
  visit: string;
  appointed: string;
  settlement: string;
  process: string;
  nextAdvice: string;
  lines: { name: string; unit?: string; qty: string; price: string; amount: string; flag: string }[];
  total: string;
};

export type DocTableCol = { key: string; label: string; weight: number };

export type DocTableReport = {
  shop: string;
  shopPhone: string;
  title: string;
  docNo: string;
  status: string;
  metaLines: string[];
  cols: DocTableCol[];
  rows: Record<string, string>[];
  footLines: string[];
  /** 不传则不画合计（装机单） */
  total?: string;
};

export async function renderDocTablePng(data: DocTableReport) {
  const rowH = 32;
  const metaH = 22 * Math.max(1, data.metaLines.length);
  const headH = 108 + metaH;
  const tableHead = 36;
  const footLines = data.footLines.filter(Boolean);
  const foot = 28 + footLines.length * 22 + (data.total ? 8 : 0);
  const w = 900;
  const pad = 16;
  const inner = w - pad * 2;
  const weightSum = data.cols.reduce((s, c) => s + Math.max(1, c.weight), 0) || 1;
  const xs: number[] = [];
  let acc = pad;
  for (const c of data.cols) {
    xs.push(acc);
    acc += (Math.max(1, c.weight) / weightSum) * inner;
  }
  const h = headH + tableHead + Math.max(1, data.rows.length) * rowH + foot;
  const rows =
    data.rows.length === 0
      ? `<text x="${pad}" y="${headH + tableHead + 22}" font-size="14" fill="#748194">没有明细</text>`
      : data.rows
          .map((r, i) => {
            const y = headH + tableHead + i * rowH;
            const bg = i % 2 === 0 ? "#ffffff" : "#f7f8fa";
            const cells = data.cols
              .map((c, ci) => `<text x="${xs[ci]}" y="${y + 22}" font-size="13" fill="#1c2333">${esc((r[c.key] || "—").slice(0, 40))}</text>`)
              .join("");
            return `<rect x="0" y="${y}" width="${w}" height="${rowH}" fill="${bg}"/>${cells}`;
          })
          .join("");
  const headCells = data.cols
    .map((c, i) => `<text x="${xs[i]}" y="${headH + 24}" font-size="13" fill="#ffffff">${esc(c.label)}</text>`)
    .join("");
  const metas = data.metaLines
    .map((line, i) => `<text x="24" y="${108 + i * 22}" font-size="14" fill="#3d4a5c">${esc(line.slice(0, 90))}</text>`)
    .join("");
  const foots = footLines
    .map((line, i) => `<text x="24" y="${h - foot + 22 + i * 22}" font-size="13" fill="#3d4a5c">${esc(line.slice(0, 90))}</text>`)
    .join("");
  const totalSvg = data.total
    ? `<text x="640" y="${h - 18}" font-size="18" font-weight="700" fill="#2b5ba8">合计 ${esc(data.total)}</text>`
    : "";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"
  font-family="Microsoft YaHei, Noto Sans SC, WenQuanYi Micro Hei, sans-serif">
  <rect width="${w}" height="${h}" fill="#ffffff"/>
  <rect width="${w}" height="8" fill="#2b5ba8"/>
  <text x="24" y="42" font-size="22" font-weight="700" fill="#1c2333">${esc(data.shop)}</text>
  <text x="24" y="68" font-size="13" fill="#748194">${esc(data.shopPhone)}</text>
  <text x="24" y="96" font-size="20" font-weight="700" fill="#2b5ba8">${esc(data.title)} ${esc(data.docNo)}</text>
  <text x="720" y="96" font-size="14" fill="#b45309">${esc(data.status)}</text>
  ${metas}
  <rect x="0" y="${headH}" width="${w}" height="${tableHead}" fill="#2b5ba8"/>
  ${headCells}
  ${rows}
  <line x1="0" y1="${h - foot}" x2="${w}" y2="${h - foot}" stroke="#d4d8e1"/>
  ${foots}
  ${totalSvg}
</svg>`;

  const fontFile = await resolveCjkFont();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: w },
    font: {
      fontFiles: fontFile ? [fontFile] : [],
      loadSystemFonts: true,
      defaultFontFamily: "Microsoft YaHei",
    },
  });
  return Buffer.from(resvg.render().asPng());
}

export async function renderWorkOrderPng(data: WorkOrderReport) {
  const lines = data.lines.map((l) => ({
    name: `${l.name}${l.flag ? `  ${l.flag}` : ""}`,
    unit: l.unit || "",
    qty: l.qty,
    price: l.price,
    amount: l.amount,
  }));
  return renderDocTablePng({
    shop: data.shop,
    shopPhone: data.shopPhone,
    title: data.title,
    docNo: data.docNo,
    status: data.status,
    metaLines: [
      `客户：${data.customer}　电话：${data.phone || "—"}`,
      `地址：${data.address || "—"}　${data.visit}　${data.appointed}　${data.settlement}`,
    ],
    cols: [
      { key: "name", label: "品名", weight: 38 },
      { key: "unit", label: "单位", weight: 8 },
      { key: "qty", label: "数量", weight: 12 },
      { key: "price", label: "单价", weight: 14 },
      { key: "amount", label: "金额", weight: 14 },
    ],
    rows: lines,
    footLines: [`过程：${data.process || "—"}`, `建议：${data.nextAdvice || "—"}`],
    total: data.total,
  });
}
