/** 自助装机兼容提示：从名称/规格/参数里认插槽、内存代数等，缺字段则跳过该项。 */

export type PartTraits = {
  sockets: string[];
  rams: string[];
  form: number; // 0 未知，1 ITX … 4 EATX
  psuW: number;
  gpuW: number;
  needsDgpu: boolean;
  hasIgpuHint: boolean;
};

export type CompatIssue = { level: "error" | "warn"; text: string };

const SOCKETS = [
  "LGA1851",
  "LGA1700",
  "LGA1200",
  "LGA1151",
  "LGA1150",
  "LGA1156",
  "LGA1155",
  "LGA775",
  "AM5",
  "AM4",
  "AM3+",
  "FM2+",
  "AM3",
  "FM2",
  "AM2+",
  "AM2",
];

const CHIPSET_SOCKET: Record<string, string> = {
  Z890: "LGA1851",
  B860: "LGA1851",
  H810: "LGA1851",
  Z790: "LGA1700",
  B760: "LGA1700",
  H770: "LGA1700",
  H610: "LGA1700",
  Z690: "LGA1700",
  B660: "LGA1700",
  H670: "LGA1700",
  Z590: "LGA1200",
  B560: "LGA1200",
  H510: "LGA1200",
  Z490: "LGA1200",
  B460: "LGA1200",
  H410: "LGA1200",
  Z390: "LGA1151",
  B365: "LGA1151",
  H310: "LGA1151",
  Z370: "LGA1151",
  B360: "LGA1151",
  Z270: "LGA1151",
  B250: "LGA1151",
  H270: "LGA1151",
  Z170: "LGA1151",
  B150: "LGA1151",
  H170: "LGA1151",
  H110: "LGA1151",
  Z97: "LGA1150",
  B85: "LGA1150",
  H81: "LGA1150",
  Z87: "LGA1150",
  Z77: "LGA1155",
  B75: "LGA1155",
  H61: "LGA1155",
  P55: "LGA1156",
  H55: "LGA1156",
  P45: "LGA775",
  G41: "LGA775",
  X870: "AM5",
  B850: "AM5",
  X670: "AM5",
  B650: "AM5",
  A620: "AM5",
  X570: "AM4",
  B550: "AM4",
  A520: "AM4",
  B450: "AM4",
  A320: "AM4",
  X470: "AM4",
};

const GPU_W: [RegExp, number][] = [
  [/RTX\s*4090/i, 450],
  [/RTX\s*4080/i, 320],
  [/RTX\s*4070\s*TI/i, 285],
  [/RTX\s*4070/i, 200],
  [/RTX\s*4060\s*TI/i, 160],
  [/RTX\s*4060/i, 115],
  [/RTX\s*3090/i, 350],
  [/RTX\s*3080/i, 320],
  [/RTX\s*3070/i, 220],
  [/RTX\s*3060/i, 170],
  [/RTX\s*3050/i, 130],
  [/RTX\s*5090/i, 575],
  [/RTX\s*5080/i, 360],
  [/RTX\s*5070/i, 250],
  [/RTX\s*5060/i, 145],
  [/RTX\s*5050/i, 130],
  [/Arc\s*B580/i, 190],
  [/Arc\s*A770/i, 225],
  [/RX\s*7900/i, 315],
  [/RX\s*7800/i, 263],
  [/RX\s*7700/i, 245],
  [/RX\s*7600/i, 165],
];

function blobOf(p: { code?: string; name?: string; spec?: string; brand?: string; params?: string; category?: string }) {
  return [p.code, p.brand, p.name, p.spec, p.params, p.category].filter(Boolean).join(" ");
}

export function parsePartTraits(p: {
  code?: string;
  name?: string;
  spec?: string;
  brand?: string;
  params?: string;
  category?: string;
}): PartTraits {
  const t = blobOf(p).toUpperCase().replace(/Ｌ/g, "L");
  const sockets = new Set<string>();
  for (const s of SOCKETS) {
    if (t.includes(s)) sockets.add(s);
  }
  for (const [chip, sock] of Object.entries(CHIPSET_SOCKET)) {
    if (new RegExp(`(?:^|[^A-Z0-9])${chip}(?:[^A-Z0-9]|$)`).test(t)) sockets.add(sock);
  }
  const rams: string[] = [];
  for (const r of ["DDR5", "DDR4", "DDR3", "DDR2"]) {
    if (t.includes(r)) rams.push(r);
  }
  let form = 0;
  if (/\bE-?ATX\b/.test(t) || t.includes("EATX")) form = 4;
  else if (/\bM-?ATX\b/.test(t) || t.includes("MATX") || t.includes("MICRO-ATX")) form = 2;
  else if (/\bMINI-?ITX\b/.test(t) || /\bITX\b/.test(t)) form = 1;
  else if (/\bATX\b/.test(t)) form = 3;
  const wm = t.match(/(\d{3,4})\s*W/);
  const psuW = wm ? Number(wm[1]) : 0;
  let gpuW = 0;
  for (const [re, w] of GPU_W) {
    if (re.test(t)) {
      gpuW = w;
      break;
    }
  }
  const name = `${p.name ?? ""} ${p.spec ?? ""}`;
  const needsDgpu = /[iI][3579]-?\d{3,5}F\b|[iI][3579]-?\d{3,5}KF\b|Ultra\s*[3579]\s*\d{2,4}F\b|230F|225F|14400F|14600KF/.test(name);
  const hasIgpuHint = /核显|核芯显卡|核芯顯示/.test(`${p.name ?? ""}${p.spec ?? ""}${p.params ?? ""}`);
  return { sockets: [...sockets], rams, form, psuW, gpuW, needsDgpu, hasIgpuHint };
}

function overlap(a: string[], b: string[]) {
  if (!a.length || !b.length) return true;
  return a.some((x) => b.includes(x));
}

export function buildCompatIssues(
  selected: Partial<Record<string, Parameters<typeof parsePartTraits>[0] | undefined>>,
): CompatIssue[] {
  const cpu = selected.CPU ? parsePartTraits(selected.CPU) : undefined;
  const mb = selected.主板 ? parsePartTraits(selected.主板) : undefined;
  const ram = selected.内存 ? parsePartTraits(selected.内存) : undefined;
  const gpu = selected.显卡 ? parsePartTraits(selected.显卡) : undefined;
  const psu = selected.电源 ? parsePartTraits(selected.电源) : undefined;
  const box = selected.机箱 ? parsePartTraits(selected.机箱) : undefined;
  const issues: CompatIssue[] = [];

  if (cpu && mb && cpu.sockets.length && mb.sockets.length && !overlap(cpu.sockets, mb.sockets)) {
    issues.push({
      level: "error",
      text: `CPU 插槽 ${cpu.sockets.join("/")} 对不上主板 ${mb.sockets.join("/")}`,
    });
  }
  if (mb && ram && mb.rams.length && ram.rams.length && !overlap(mb.rams, ram.rams)) {
    issues.push({
      level: "error",
      text: `内存 ${ram.rams.join("/")} 对不上主板 ${mb.rams.join("/")}`,
    });
  }
  if (cpu && ram && cpu.rams.length && ram.rams.length && !overlap(cpu.rams, ram.rams)) {
    issues.push({
      level: "warn",
      text: `内存 ${ram.rams.join("/")} 和这颗 U 标注的 ${cpu.rams.join("/")} 可能不一致，装机前再对一下说明书`,
    });
  }
  if (mb && box && mb.form && box.form && box.form < mb.form) {
    issues.push({
      level: "error",
      text: "主板板型大于机箱能装的尺寸（例如 ATX 板塞 MATX 箱）",
    });
  }
  if (gpu?.gpuW && psu?.psuW && psu.psuW + 20 < gpu.gpuW + 200) {
    issues.push({
      level: "warn",
      text: `这张卡大约要 ${gpu.gpuW}W，电源标 ${psu.psuW}W，余量偏紧，建议换更大额定`,
    });
  }
  if (cpu?.needsDgpu && !gpu && !cpu.hasIgpuHint) {
    issues.push({
      level: "warn",
      text: "这颗 U 多半没有核显（F/KF），要配独显才能出画面",
    });
  }
  return issues;
}

/** 正在选某一档时，相对已选配件的冲突（用于列表角标）。 */
export function hitConflicts(
  slot: string,
  hit: Parameters<typeof parsePartTraits>[0],
  selected: Partial<Record<string, Parameters<typeof parsePartTraits>[0] | undefined>>,
) {
  return buildCompatIssues({ ...selected, [slot]: hit }).filter((i) => i.level === "error");
}
