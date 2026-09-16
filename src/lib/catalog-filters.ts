export const BRAND_ORDER = [
  "店配",
  "英特尔",
  "AMD",
  "微星",
  "华硕",
  "技嘉",
  "华擎",
  "昂达",
  "七彩虹",
  "蓝宝石",
  "影驰",
  "迪兰",
  "长城",
  "联想",
  "海康威视",
  "大华",
  "萤石",
  "乐橙",
  "天地伟业",
  "锐捷",
  "华为",
  "TP-LINK",
  "水星",
  "EPSON",
  "佳能",
  "得实",
  "映美",
  "TSC",
  "POSTEK",
  "芯烨",
  "另色鬼",
  "金士顿",
  "三星",
  "西数",
  "希捷",
];

export function brandRank(brand: string) {
  const i = BRAND_ORDER.indexOf(brand);
  return i < 0 ? 99 : i;
}

export function catalogParamsText(input: {
  spec: string;
  remark?: string;
  sale: number;
  cost: number;
  warranty?: number;
  name: string;
}) {
  const lines = [
    input.spec ? `型号规格：${input.spec}` : "",
    input.name.includes("散片") ? "形态：散片（无原装风扇）" : input.name.includes("盒装") ? "形态：盒装" : "",
    `参考零售价：${input.sale} 元`,
    `参考进价：${input.cost} 元`,
    input.warranty != null ? `参考保修：${input.warranty} 个月` : "",
    input.remark ?? "",
  ];
  return lines.filter(Boolean).join("\n");
}
