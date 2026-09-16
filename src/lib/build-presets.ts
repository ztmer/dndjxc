/** 新建配置单配件清单顺序。 */
export const BUILD_SLOTS = [
  "CPU",
  "主板",
  "内存",
  "SSD硬盘",
  "硬盘",
  "显卡",
  "显示器",
  "机箱",
  "电源",
  "散热器",
  "键鼠",
] as const;

export type BuildSlot = (typeof BUILD_SLOTS)[number];

/** 配件位对应产品分类，清单里只能搜这一类。 */
export const SLOT_CAT_CODES: Record<BuildSlot, string[]> = {
  CPU: ["PC-CPU"],
  主板: ["PC-MB"],
  内存: ["PC-RAM"],
  SSD硬盘: ["PC-SSD"],
  硬盘: ["PC-HDD"],
  显卡: ["PC-GPU"],
  显示器: ["PC-MON"],
  机箱: ["PC-CASE"],
  电源: ["PC-PSU"],
  散热器: ["PC-COOL"],
  键鼠: ["PC-KM"],
};

const SLOT_CAT_HINTS: Record<string, string[]> = {
  CPU: ["cpu", "处理器"],
  主板: ["主板"],
  内存: ["内存"],
  SSD硬盘: ["固态"],
  硬盘: ["硬盘"],
  显卡: ["显卡"],
  显示器: ["显示器"],
  机箱: ["机箱"],
  电源: ["电源"],
  散热器: ["散热"],
  键鼠: ["键鼠", "键盘", "鼠标"],
};

export function matchesSlotHint(_slot: BuildSlot, _name: string, _code: string) {
  return true;
}

export function productMatchesSlot(
  slot: string | undefined,
  p: { categoryCode?: string; category?: string; name?: string },
) {
  if (!slot || slot === "其它" || !(BUILD_SLOTS as readonly string[]).includes(slot)) return true;
  const s = slot as BuildSlot;
  const codes = SLOT_CAT_CODES[s];
  if (p.categoryCode) {
    if (codes.includes(p.categoryCode)) return true;
    if (s === "硬盘" && p.categoryCode === "PC-SSD") return false;
    if (s === "SSD硬盘" && p.categoryCode === "PC-HDD") return false;
    return false;
  }
  const blob = `${p.category ?? ""} ${p.name ?? ""}`.toLowerCase();
  if (s === "硬盘") return blob.includes("硬盘") && !blob.includes("固态");
  if (s === "SSD硬盘") return blob.includes("固态");
  return (SLOT_CAT_HINTS[s] ?? [s]).some((h) => blob.includes(h.toLowerCase()));
}

/** 旧配置单配件位改名。 */
export function canonicalBuildSlot(slot?: string) {
  if (!slot) return slot;
  if (slot === "固态") return "SSD硬盘";
  if (slot === "鼠标" || slot === "键盘") return "键鼠";
  if (slot === "安装服务") return "其它";
  return slot;
}

export type BuildPresetPart = { slot: BuildSlot; code: string; qty?: string };

export const DIY_SCENES = [
  "家用办公",
  "畅玩游戏",
  "发烧电竞",
  "电竞直播",
  "图形设计",
  "AI绘图渲染",
  "影视后期",
  "工业设计",
] as const;

export const DIY_PRICE_BANDS = [
  "3000以下",
  "3000-3999",
  "4000-4999",
  "5000-5999",
  "6000-6999",
  "7000-7999",
  "8000-8999",
  "9000-9999",
  "10000-11999",
  "12000-13999",
  "14000-15999",
  "16000-17999",
  "18000-19999",
  "20000-24999",
  "25000-29999",
  "30000以上",
] as const;

export type DiyKit = {
  id: string;
  code: string;
  name: string;
  scene: (typeof DIY_SCENES)[number];
  hint: string;
  laborFee: string;
  sale: number;
  cost: number;
  cpu: string;
  gpu: string;
  mb: string;
  ram: string;
  remark: string;
  parts: BuildPresetPart[];
};

export type BuildPreset = {
  id: string;
  name: string;
  hint: string;
  laborFee: string;
  remark: string;
  parts: BuildPresetPart[];
};

/** 参考京东装机宝典 diylds.jd.com/#/loadstore：场景 + CPU/显卡/主板/内存卡片。配件用本店稳定编码。 */
export const DIY_KITS: DiyKit[] = [
  {
    id: "office",
    code: "KIT-OFFICE",
    name: "办公电脑 i3 核显",
    scene: "家用办公",
    hint: "核显、装系统办公",
    laborFee: "120",
    sale: 2899,
    cost: 2100,
    cpu: "英特尔 | i3-12100",
    gpu: "可自主选装（核显）",
    mb: "微星 | PRO H610M-E DDR4",
    ram: "金士顿 | 16GB×2 3200",
    remark: "核显即可。装系统、办公软件；不配独显。",
    parts: [
      { slot: "主板", code: "MB-H610" },
      { slot: "CPU", code: "CPU-I3" },
      { slot: "内存", code: "RAM16", qty: "2" },
      { slot: "SSD硬盘", code: "SSD512" },
      { slot: "电源", code: "PSU-550" },
      { slot: "机箱", code: "CASE-OFFICE" },
      { slot: "散热器", code: "COOL-STOCK" },
    ],
  },
  {
    id: "office-14600",
    code: "KIT-OFFICE-14600",
    name: "家用办公 i5-14600K 核显",
    scene: "家用办公",
    hint: "参考京东同名套餐",
    laborFee: "150",
    sale: 5642,
    cost: 4300,
    cpu: "英特尔 | i5-14600K",
    gpu: "可自主选装（核显）",
    mb: "华硕 | PRIME B760M-A D4",
    ram: "金士顿 | 32GB 6000",
    remark: "核显办公、轻度剪辑。需要独显再改配件位。",
    parts: [
      { slot: "主板", code: "MB-B760" },
      { slot: "CPU", code: "CPU-14600K" },
      { slot: "内存", code: "RAM32" },
      { slot: "SSD硬盘", code: "SSD1T" },
      { slot: "电源", code: "PSU-550" },
      { slot: "机箱", code: "CASE-OFFICE" },
      { slot: "散热器", code: "COOL-TOWER" },
    ],
  },
  {
    id: "game-14400-5050",
    code: "KIT-GAME-14400-5050",
    name: "性价巅峰 14400F RTX 5050",
    scene: "畅玩游戏",
    hint: "1080p 网游走量",
    laborFee: "180",
    sale: 7762,
    cost: 5980,
    cpu: "英特尔 | i5-14400F",
    gpu: "七彩虹 | RTX 5050 8GB",
    mb: "华硕 | B760M",
    ram: "金士顿 | 32GB",
    remark: "对照京东装机宝典「性价巅峰 1400 RTX 5050」。",
    parts: [
      { slot: "主板", code: "MB-B760" },
      { slot: "CPU", code: "CPU-I5" },
      { slot: "内存", code: "RAM32" },
      { slot: "SSD硬盘", code: "SSD1T" },
      { slot: "显卡", code: "GPU-5050" },
      { slot: "电源", code: "PSU-750" },
      { slot: "机箱", code: "CASE-GAME" },
      { slot: "散热器", code: "COOL-TOWER" },
    ],
  },
  {
    id: "game-14400-5050b",
    code: "KIT-GAME-14400-5050B",
    name: "高频畅玩 14400F RTX 5050",
    scene: "畅玩游戏",
    hint: "七彩虹板卡档",
    laborFee: "180",
    sale: 8053,
    cost: 6180,
    cpu: "英特尔 | i5-14400F",
    gpu: "七彩虹 | RTX 5050 8GB",
    mb: "七彩虹 | B760M-K D4",
    ram: "金士顿 | 32GB",
    remark: "对照京东「高频畅玩 14400F RTX 5050」。",
    parts: [
      { slot: "主板", code: "MB-B760-CF" },
      { slot: "CPU", code: "CPU-I5" },
      { slot: "内存", code: "RAM32" },
      { slot: "SSD硬盘", code: "SSD1T" },
      { slot: "显卡", code: "GPU-5050" },
      { slot: "电源", code: "PSU-750" },
      { slot: "机箱", code: "CASE-GAME" },
      { slot: "散热器", code: "COOL-TOWER" },
    ],
  },
  {
    id: "game-14400-3050",
    code: "KIT-GAME-14400-3050",
    name: "性价电玩 14400F RTX3050",
    scene: "畅玩游戏",
    hint: "入门光追",
    laborFee: "180",
    sale: 7713,
    cost: 5900,
    cpu: "英特尔 | i5-14400F",
    gpu: "七彩虹 | RTX 3050 8GB",
    mb: "华硕 | TUF B760M-PLUS WIFI",
    ram: "金士顿 | 32GB",
    remark: "对照京东「性价电玩 14490F RTX3050」。",
    parts: [
      { slot: "主板", code: "MB-B760-D5-ASUS" },
      { slot: "CPU", code: "CPU-I5" },
      { slot: "内存", code: "RAM32" },
      { slot: "SSD硬盘", code: "SSD1T" },
      { slot: "显卡", code: "GPU-RTX3050" },
      { slot: "电源", code: "PSU-750" },
      { slot: "机箱", code: "CASE-GAME" },
      { slot: "散热器", code: "COOL-TOWER" },
    ],
  },
  {
    id: "game-230f-5050",
    code: "KIT-GAME-230F-5050",
    name: "办公网游 U5-230F RTX 5050",
    scene: "畅玩游戏",
    hint: "新平台入门",
    laborFee: "180",
    sale: 7641,
    cost: 5850,
    cpu: "英特尔 | Ultra 5 230F",
    gpu: "七彩虹 | RTX 5050 8GB",
    mb: "微星 | PRO H810M-B",
    ram: "金士顿 | 16GB 3200",
    remark: "对照京东「办公网游 U5-230F RTX 5050」。内存可改双通道。",
    parts: [
      { slot: "主板", code: "MB-H810-MSI" },
      { slot: "CPU", code: "CPU-U5-230F" },
      { slot: "内存", code: "RAM16", qty: "2" },
      { slot: "SSD硬盘", code: "SSD1T" },
      { slot: "显卡", code: "GPU-5050" },
      { slot: "电源", code: "PSU-750" },
      { slot: "机箱", code: "CASE-GAME" },
      { slot: "散热器", code: "COOL-STOCK" },
    ],
  },
  {
    id: "game-225f-b580",
    code: "KIT-GAME-225F-B580",
    name: "高频畅玩 225F B580",
    scene: "畅玩游戏",
    hint: "Arc 性价",
    laborFee: "180",
    sale: 7982,
    cost: 6120,
    cpu: "英特尔 | Ultra 5 225F",
    gpu: "七彩虹 | Arc B580 12GB",
    mb: "技嘉 | B860M GAMING WIFI",
    ram: "金士顿 | 32GB",
    remark: "对照京东「高频畅玩 225F B580」。",
    parts: [
      { slot: "主板", code: "MB-B860-GB" },
      { slot: "CPU", code: "CPU-U5-225F" },
      { slot: "内存", code: "RAM32" },
      { slot: "SSD硬盘", code: "SSD1T" },
      { slot: "显卡", code: "GPU-B580" },
      { slot: "电源", code: "PSU-750" },
      { slot: "机箱", code: "CASE-GAME" },
      { slot: "散热器", code: "COOL-TOWER" },
    ],
  },
  {
    id: "game-14400-a770",
    code: "KIT-GAME-14400-A770",
    name: "电竞设计性价 14400 A770",
    scene: "图形设计",
    hint: "Arc 创作入门",
    laborFee: "160",
    sale: 5071,
    cost: 3880,
    cpu: "英特尔 | i5-14400F",
    gpu: "蓝戟 | Arc A770 8GB",
    mb: "微星 | PRO H610M-E DDR4",
    ram: "金士顿 | 16GB",
    remark: "对照京东「电竞设计性价 14400 A770」。",
    parts: [
      { slot: "主板", code: "MB-H610" },
      { slot: "CPU", code: "CPU-I5" },
      { slot: "内存", code: "RAM16", qty: "2" },
      { slot: "SSD硬盘", code: "SSD1T" },
      { slot: "显卡", code: "GPU-A770" },
      { slot: "电源", code: "PSU-550" },
      { slot: "机箱", code: "CASE-OFFICE" },
      { slot: "散热器", code: "COOL-TOWER" },
    ],
  },
  {
    id: "game",
    code: "KIT-GAME",
    name: "游戏主机 14400F RTX 4060",
    scene: "畅玩游戏",
    hint: "1080p 高画质",
    laborFee: "180",
    sale: 8999,
    cost: 6900,
    cpu: "英特尔 | i5-14400F",
    gpu: "七彩虹 | RTX 4060 8GB",
    mb: "华硕 | PRIME B760M-A D4",
    ram: "金士顿 | 32GB",
    remark: "1080p 高画质网游/3A。装系统、显卡驱动。",
    parts: [
      { slot: "主板", code: "MB-B760" },
      { slot: "CPU", code: "CPU-I5" },
      { slot: "内存", code: "RAM32" },
      { slot: "SSD硬盘", code: "SSD1T" },
      { slot: "显卡", code: "GPU-4060" },
      { slot: "电源", code: "PSU-750" },
      { slot: "机箱", code: "CASE-GAME" },
      { slot: "散热器", code: "COOL-TOWER" },
    ],
  },
  {
    id: "esports",
    code: "KIT-ESPORTS",
    name: "发烧电竞 7800X3D 4070S",
    scene: "发烧电竞",
    hint: "2K 高刷",
    laborFee: "220",
    sale: 12999,
    cost: 10200,
    cpu: "AMD | 锐龙 7 7800X3D",
    gpu: "技嘉 | RTX 4070 SUPER 12GB",
    mb: "技嘉 | B650M GAMING X AX",
    ram: "金士顿 | 32GB",
    remark: "2K 电竞。出库核对显卡 SN。",
    parts: [
      { slot: "主板", code: "MB-B650" },
      { slot: "CPU", code: "CPU-7800X3D" },
      { slot: "内存", code: "RAM32" },
      { slot: "SSD硬盘", code: "SSD2T" },
      { slot: "显卡", code: "GPU-4070" },
      { slot: "电源", code: "PSU-850" },
      { slot: "机箱", code: "CASE-GAME" },
      { slot: "散热器", code: "COOL-AIO240" },
    ],
  },
  {
    id: "design",
    code: "KIT-DESIGN",
    name: "设计主机 R7 4070S",
    scene: "图形设计",
    hint: "剪辑 / PS / CAD",
    laborFee: "200",
    sale: 11800,
    cost: 9200,
    cpu: "AMD | 锐龙 7 7700",
    gpu: "技嘉 | RTX 4070 SUPER 12GB",
    mb: "技嘉 | B650M GAMING X AX",
    ram: "金士顿 | 32GB×2",
    remark: "剪辑、PS、CAD。内存和固态加大，配 240 水冷。",
    parts: [
      { slot: "主板", code: "MB-B650" },
      { slot: "CPU", code: "CPU-R7" },
      { slot: "内存", code: "RAM32", qty: "2" },
      { slot: "SSD硬盘", code: "SSD2T" },
      { slot: "显卡", code: "GPU-4070" },
      { slot: "电源", code: "PSU-850" },
      { slot: "机箱", code: "CASE-WS" },
      { slot: "散热器", code: "COOL-AIO240" },
    ],
  },
  {
    id: "ai",
    code: "KIT-AI",
    name: "AI 绘图 14900K 4090",
    scene: "AI绘图渲染",
    hint: "本地大模型 / 出图",
    laborFee: "280",
    sale: 24999,
    cost: 19800,
    cpu: "英特尔 | i9-14900K",
    gpu: "华硕 | RTX 4090 24GB",
    mb: "华硕 | TUF X870-PLUS WIFI",
    ram: "金士顿 | 64GB",
    remark: "本地出图。电源和机箱按 4090 长度预留。",
    parts: [
      { slot: "主板", code: "MB-X870" },
      { slot: "CPU", code: "CPU-I9" },
      { slot: "内存", code: "RAM64" },
      { slot: "SSD硬盘", code: "SSD2T" },
      { slot: "硬盘", code: "HDD1T" },
      { slot: "显卡", code: "GPU-4090" },
      { slot: "电源", code: "PSU-1200" },
      { slot: "机箱", code: "CASE-HIGH" },
      { slot: "散热器", code: "COOL-AIO360" },
    ],
  },
  {
    id: "high",
    code: "KIT-HIGH",
    name: "高端主机 4K / 重度创作",
    scene: "影视后期",
    hint: "4K / 重度创作",
    laborFee: "280",
    sale: 22800,
    cost: 18200,
    cpu: "英特尔 | i9-14900K",
    gpu: "华硕 | RTX 4090 24GB",
    mb: "华硕 | TUF X870-PLUS WIFI",
    ram: "金士顿 | 64GB",
    remark: "4K 游戏或重度创作。出库请核对显卡/主板唯一 SN。",
    parts: [
      { slot: "主板", code: "MB-X870" },
      { slot: "CPU", code: "CPU-I9" },
      { slot: "内存", code: "RAM64" },
      { slot: "SSD硬盘", code: "SSD2T" },
      { slot: "硬盘", code: "HDD1T" },
      { slot: "显卡", code: "GPU-4090" },
      { slot: "电源", code: "PSU-1200" },
      { slot: "机箱", code: "CASE-HIGH" },
      { slot: "散热器", code: "COOL-AIO360" },
    ],
  },
];

export const BUILD_PRESETS: BuildPreset[] = DIY_KITS.map((k) => ({
  id: k.id,
  name: k.name,
  hint: `${k.scene} · ${k.hint}`,
  laborFee: k.laborFee,
  remark: k.remark,
  parts: k.parts,
}));

export function findDiyKit(key: string) {
  return DIY_KITS.find((k) => k.id === key || k.code === key);
}

export function diyPriceFilter(band?: string): { gte?: number; lt?: number } | undefined {
  if (!band) return undefined;
  if (band === "3000以下") return { lt: 3000 };
  if (band === "30000以上") return { gte: 30000 };
  const m = /^(\d+)-(\d+)$/.exec(band);
  if (!m) return undefined;
  return { gte: Number(m[1]), lt: Number(m[2]) + 1 };
}

export function parseDiyHighlights(params: string) {
  const pick = (key: string) => {
    const line = params.split("\n").find((l) => l.startsWith(`${key}：`) || l.startsWith(`${key}:`));
    return line ? line.slice(key.length + 1).trim() : "";
  };
  return {
    scene: pick("场景"),
    cpu: pick("CPU"),
    gpu: pick("显卡"),
    mb: pick("主板"),
    ram: pick("内存"),
  };
}
