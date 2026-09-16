/** 台式机 CPU 公开规格模板：从型号/规格推断插槽、功耗等，不抓电商图。 */

export type CpuFacts = {
  socket: string;
  cores: string;
  tdp: string;
  igpu: string;
  memory: string;
  oc: string;
  cache3d: boolean;
};

const SOCKETS = ["LGA1851", "LGA1700", "LGA1200", "LGA1151", "LGA1150", "LGA1156", "LGA1155", "LGA775", "AM5", "AM4", "AM3+", "FM2+", "AM3", "FM2"];

function memoryForSocket(socket: string) {
  if (socket === "LGA1851" || socket === "AM5") return "DDR5";
  if (socket === "LGA1700") return "DDR4 / DDR5（看主板）";
  if (socket === "LGA1200" || socket === "LGA1151" || socket === "AM4") return "DDR4";
  if (socket === "LGA775") return "DDR2 / DDR3（看主板）";
  if (["LGA1156", "LGA1155", "LGA1150", "AM3", "AM3+", "FM2", "FM2+"].includes(socket)) return "DDR3";
  return "";
}

function inferTdp(blob: string, socket: string, brand: string) {
  const m = blob.match(/(\d{2,3})\s*W/i);
  if (m) return `${m[1]}W`;
  if (/3D/.test(blob) && /AM5/.test(socket + blob)) return "120W（参考，3D 缓存款以包装为准）";
  if (/K\b|KF\b/.test(blob) && brand === "英特尔") return "125W（K/KF 参考基准功耗）";
  if (socket === "LGA1851") return /K\b/.test(blob) ? "125W（参考）" : "65W（参考）";
  if (socket === "LGA1700") return /K\b|KF\b/.test(blob) ? "125W（参考）" : "65W（参考）";
  if (socket === "LGA1200") return /K\b/.test(blob) ? "125W（参考）" : "65W（参考）";
  if (socket === "AM5") return /X\b|X3D/.test(blob) && !/7600\b|7700\b|9600X|9700X/.test(blob) ? "170W（参考）" : "65W（参考）";
  if (socket === "AM4") return /X\b|X3D/.test(blob) ? "105W（参考）" : "65W（参考）";
  if (socket === "AM3+" || socket === "AM3") return "95W（参考）";
  if (socket.startsWith("FM2")) return "95W（参考）";
  if (socket === "LGA775") return /Q\d|四核/.test(blob) ? "95W（参考）" : "65W（参考）";
  if (socket.startsWith("LGA115")) return /i7|i9/.test(blob) ? "84W（参考）" : "65W（参考）";
  return "";
}

function inferIgpu(blob: string) {
  if (/无核显|\bKF\b|\d{3,5}F\b|Ultra\s*[3579]\s*\d{2,4}F\b|7500F/.test(blob)) {
    return "无核显，需独显才能出画面";
  }
  const extra = blob.match(/UHD\s*\d+|Vega\s*\d+|Arc/)?.[0];
  if (/核显|UHD|Arc|Vega|APU|\dG\b/.test(blob)) {
    return extra ? `带核显（${extra}）` : "带核显";
  }
  if (/AM4/.test(blob)) return "无核显，需独显才能出画面";
  if (/AM5/.test(blob)) return extra ? `带核显（${extra}）` : "带核显（核显能力有限）";
  return "以包装说明为准";
}

export function parseCpuFacts(brand: string, name: string, spec: string): CpuFacts {
  const blob = `${name} ${spec}`;
  const socket = SOCKETS.find((s) => blob.toUpperCase().includes(s)) ?? "";
  const ct = blob.match(/(\d+)\s*核(?:(\d+)\s*线程)?/);
  const cores = ct ? (ct[2] ? `${ct[1]}核${ct[2]}线程` : `${ct[1]}核`) : "";
  const tdp = inferTdp(blob, socket, brand);
  const igpu = inferIgpu(blob);
  const memory = memoryForSocket(socket);
  const oc = /可超频|\bK\b|\bKF\b|\bX\b/.test(blob) && !/FX-/.test(blob) ? "可超频（需主板支持）" : "锁倍频";
  const cache3d = /3D/.test(blob);
  return { socket, cores, tdp, igpu, memory, oc, cache3d };
}

export function cpuParamsText(input: {
  brand: string;
  name: string;
  spec: string;
  remark?: string;
}) {
  const tray = input.name.includes("散片");
  const f = parseCpuFacts(input.brand, input.name, input.spec);
  return [
    `品牌：${input.brand}`,
    `型号：${input.name}`,
    tray ? "形态：散片/拆机，无原装风扇" : "形态：盒装（是否含原装散热以实际包装为准）",
    f.socket ? `插槽：${f.socket}` : "",
    f.cores ? `核心线程：${f.cores}` : "",
    f.tdp ? `TDP：${f.tdp}` : "",
    f.igpu ? `核显：${f.igpu}` : "",
    f.memory ? `内存：${f.memory}` : "",
    f.cache3d ? "缓存：3D V-Cache" : "",
    `超频：${f.oc}`,
    "适用：台式机散件，不含笔记本 U",
    tray ? "保修：散片店保，以保修月为准" : "保修：盒装参考原厂，以包装为准",
    input.remark ? `备注：${input.remark}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
