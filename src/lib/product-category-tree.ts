/** 电脑店默认分类：主类 + 子类。code 稳定，种子可重复执行。 */
export const PRODUCT_CATEGORY_TREE: {
  code: string;
  name: string;
  children: { code: string; name: string; trackSerial?: boolean }[];
}[] = [
  {
    code: "PC",
    name: "组装电脑",
    children: [
      { code: "PC-KIT", name: "整机套餐" },
      { code: "PC-MB", name: "主板", trackSerial: true },
      { code: "PC-CPU", name: "CPU", trackSerial: true },
      { code: "PC-RAM", name: "内存", trackSerial: true },
      { code: "PC-HDD", name: "硬盘", trackSerial: true },
      { code: "PC-SSD", name: "固态硬盘", trackSerial: true },
      { code: "PC-GPU", name: "显卡", trackSerial: true },
      { code: "PC-PSU", name: "电源", trackSerial: true },
      { code: "PC-CASE", name: "机箱" },
      { code: "PC-COOL", name: "散热器" },
      { code: "PC-FAN", name: "风扇" },
      { code: "PC-MON", name: "显示器", trackSerial: true },
      { code: "PC-CARD", name: "声卡/扩展卡" },
      { code: "PC-ODD", name: "光驱" },
      { code: "PC-KM", name: "键鼠" },
      { code: "PC-AUDIO", name: "音箱/耳机" },
      { code: "PC-MISC", name: "组装辅材" },
    ],
  },
  {
    code: "BRAND",
    name: "品牌机",
    children: [
      { code: "BRAND-DT", name: "品牌台式机", trackSerial: true },
      { code: "BRAND-AIO", name: "品牌一体机", trackSerial: true },
      { code: "BRAND-WS", name: "品牌工作站", trackSerial: true },
      { code: "BRAND-PART", name: "品牌配件" },
    ],
  },
  {
    code: "NB",
    name: "笔记本",
    children: [
      { code: "NB-UNIT", name: "笔记本整机", trackSerial: true },
      { code: "NB-GAME", name: "游戏本", trackSerial: true },
      { code: "NB-BAT", name: "笔记本电池" },
      { code: "NB-LCD", name: "笔记本屏幕", trackSerial: true },
      { code: "NB-KB", name: "笔记本键盘" },
      { code: "NB-ADP", name: "电源适配器" },
      { code: "NB-UPG", name: "内存/硬盘升级", trackSerial: true },
      { code: "NB-ACC", name: "散热底座/包" },
    ],
  },
  {
    code: "PRT",
    name: "打印机",
    children: [
      { code: "PRT-INK", name: "喷墨打印机", trackSerial: true },
      { code: "PRT-LASER", name: "激光打印机", trackSerial: true },
      { code: "PRT-DOT", name: "针式/票据打印机", trackSerial: true },
      { code: "PRT-MFP", name: "复印机/一体机", trackSerial: true },
      { code: "PRT-SCAN", name: "扫描仪", trackSerial: true },
      { code: "PRT-PART", name: "打印机配件" },
    ],
  },
  {
    code: "CCTV",
    name: "监控安防",
    children: [
      { code: "CCTV-IP", name: "网络摄像头", trackSerial: true },
      { code: "CCTV-AHD", name: "模拟摄像头", trackSerial: true },
      { code: "CCTV-NVR", name: "硬盘录像机", trackSerial: true },
      { code: "CCTV-HDD", name: "监控硬盘", trackSerial: true },
      { code: "CCTV-POE", name: "POE 交换机" },
      { code: "CCTV-PSU", name: "监控电源" },
      { code: "CCTV-CABLE", name: "支架/线材" },
      { code: "CCTV-ACS", name: "门禁考勤", trackSerial: true },
      { code: "CCTV-ALM", name: "报警/对讲" },
    ],
  },
  {
    code: "NET",
    name: "网络产品",
    children: [
      { code: "NET-RT", name: "路由器", trackSerial: true },
      { code: "NET-SW", name: "交换机", trackSerial: true },
      { code: "NET-AP", name: "无线 AP", trackSerial: true },
      { code: "NET-NIC", name: "网卡" },
      { code: "NET-CABLE", name: "网线/水晶头" },
      { code: "NET-FIBER", name: "光纤/模块" },
      { code: "NET-RACK", name: "机柜/PDU" },
      { code: "NET-FW", name: "防火墙/网关", trackSerial: true },
    ],
  },
  {
    code: "CONS",
    name: "耗材",
    children: [
      { code: "CONS-DRUM", name: "硒鼓" },
      { code: "CONS-INK", name: "墨盒" },
      { code: "CONS-RIB", name: "色带" },
      { code: "CONS-PAPER", name: "打印纸" },
      { code: "CONS-TONER", name: "碳粉" },
      { code: "CONS-CLEAN", name: "清洁耗材" },
      { code: "CONS-BAT", name: "电池" },
    ],
  },
  {
    code: "SVC",
    name: "服务",
    children: [
      { code: "SVC-VISIT", name: "上门费" },
      { code: "SVC-BUILD", name: "组装工时" },
      { code: "SVC-REPAIR", name: "维修工时" },
      { code: "SVC-TEST", name: "检测费" },
      { code: "SVC-OUTSRC", name: "委外维修" },
    ],
  },
];

export function categoryPathLabel(name: string, parentName?: string | null) {
  return parentName ? `${parentName} / ${name}` : name;
}
