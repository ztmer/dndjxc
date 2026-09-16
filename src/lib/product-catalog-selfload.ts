import { item } from "@/lib/product-catalog-item";

/** 对照京东自助装机配件位：机箱 / 散热 / 风扇 / 显示器 / 键鼠 / 安装服务。 */
export const SELFLOAD_CATALOG = [
  // 机箱（华硕/微星/技嘉/先马/联力/追风者/恩杰）
  item("CASE-ASUS-A21", "华硕", "A21 MATX 海景房", "MATX 前置 USB-C 支持 360 水冷", "PC-CASE", 329, 240, { unit: "个", params: "品牌：华硕\n结构：MATX\n用途：自助装机办公/入门游戏" }),
  item("CASE-MSI-110R", "微星", "MAG FORGE 110R", "ATX 中塔 钢化玻璃", "PC-CASE", 299, 210, { unit: "个", params: "微星中塔，预装风扇" }),
  item("CASE-GB-C200", "技嘉", "C200 GLASS", "ATX 中塔", "PC-CASE", 279, 195, { unit: "个", params: "技嘉玻璃侧透" }),
  item("CASE-SAMA-M1", "先马", "平头哥 M1 MATX", "MATX 小机箱", "PC-CASE", 169, 110, { unit: "个", params: "先马入门办公箱" }),
  item("CASE-SAMA-TITAN", "先马", "泰坦 3 ATX", "ATX 网孔面板", "PC-CASE", 219, 150, { unit: "个", params: "先马游戏中塔" }),
  item("CASE-LL-205", "联力", "LANCOOL 205M MESH", "MATX 海景", "PC-CASE", 449, 330, { unit: "个", params: "联力 MESH 散热好" }),
  item("CASE-LL-216W", "联力", "LANCOOL 216 白", "ATX 高风量", "PC-CASE", 429, 310, { unit: "个", params: "216 白色" }),
  item("CASE-PH-P300A", "追风者", "P300A", "ATX 网孔 性价比", "PC-CASE", 299, 210, { unit: "个", params: "追风者 P300A" }),
  item("CASE-PH-NV5", "追风者", "NV5", "ATX 海景房", "PC-CASE", 549, 400, { unit: "个", params: "追风者海景" }),
  item("CASE-NZXT-H5", "恩杰", "H5 Flow", "ATX 前网孔", "PC-CASE", 599, 440, { unit: "个", params: "NZXT H5" }),
  item("CASE-NZXT-H7", "恩杰", "H7 Flow", "ATX 中塔", "PC-CASE", 699, 520, { unit: "个", params: "NZXT H7" }),
  item("CASE-GW-MINI", "长城", "mini 办公箱", "MATX 带光驱位", "PC-CASE", 129, 80, { unit: "个", params: "老办公机换箱" }),

  // 散热器
  item("COOL-AXP90", "利民", "AXP90-X47 下压", "ITX/小机箱下压", "PC-COOL", 89, 58, { unit: "个", params: "下压风冷，矮机箱" }),
  item("COOL-PA120SE", "利民", "PA120 SE 双塔", "6热管 双风扇", "PC-COOL", 149, 99, { unit: "个", params: "PA120 SE" }),
  item("COOL-FS140", "利民", "Frost Spirit 140", "双塔 140", "PC-COOL", 189, 130, { unit: "个", params: "FS140" }),
  item("COOL-FC140", "利民", "Frozen Magic 240 水冷", "240 一体水", "PC-COOL", 359, 260, { unit: "套", params: "利民 240 水冷" }),
  item("COOL-FC360", "利民", "Frozen Magic 360 水冷", "360 一体水", "PC-COOL", 499, 370, { unit: "套", params: "利民 360" }),
  item("COOL-ID-SE224", "九州风神", "SE-224-XTS 单塔", "4热管 风冷", "PC-COOL", 79, 48, { unit: "个", params: "入门单塔" }),
  item("COOL-ID-AK620", "九州风神", "AK620 双塔", "6热管", "PC-COOL", 169, 115, { unit: "个", params: "AK620" }),
  item("COOL-ID-240", "九州风神", "冰堡垒 240", "240 水冷", "PC-COOL", 329, 240, { unit: "套", params: "ID 240" }),
  item("COOL-PC-X6", "超频三", "东海 X6", "4热管下压/直触", "PC-COOL", 59, 32, { unit: "个", params: "国产入门" }),

  // 风扇
  item("FAN-C12C-3", "利民", "TL-C12C 三把装", "120mm ×3", "PC-FAN", 49, 28, { unit: "套", params: "机箱进风三把" }),
  item("FAN-SL12", "利民", "TL-SL12 无限镜", "ARGB 120mm", "PC-FAN", 39, 22, { unit: "个", params: "海景房灯效" }),
  item("FAN-ID-120", "九州风神", "魔环 120", "RGB 120mm", "PC-FAN", 25, 12, { unit: "个", params: "入门灯扇" }),

  // 显示器
  item("MON-AOC22", "AOC", "22B35 21.5 英寸", "1080P 75Hz VGA+HDMI", "PC-MON", 399, 290, { unit: "台", trackSerial: true, params: "办公小屏" }),
  item("MON-AOC27", "AOC", "27G4 27 英寸 180Hz", "2K Fast IPS", "PC-MON", 1099, 860, { unit: "台", trackSerial: true, params: "游戏 2K" }),
  item("MON-MI23", "小米", "Redmi 23.8 英寸", "1080P 100Hz", "PC-MON", 499, 380, { unit: "台", trackSerial: true, params: "小米办公" }),
  item("MON-MI27F", "小米", "G27Qi 27 2K 180Hz", "Fast IPS", "PC-MON", 899, 700, { unit: "台", trackSerial: true, params: "小米电竞" }),
  item("MON-L24", "联想", "L24e-40 23.8", "1080P 100Hz", "PC-MON", 529, 400, { unit: "台", trackSerial: true, params: "联想办公" }),
  item("MON-VG27", "华硕", "VG27AQ 27 2K 170Hz", "IPS 电竞", "PC-MON", 1599, 1250, { unit: "台", trackSerial: true, params: "华硕小金刚" }),
  item("MON-MSI24", "微星", "G244F 23.8 180Hz", "1080P Fast IPS", "PC-MON", 699, 540, { unit: "台", trackSerial: true, params: "微星电竞" }),

  // 鼠标
  item("MS-G102", "罗技", "G102 有线鼠标", "8000DPI 轻量化", "PC-KM", 89, 58, { unit: "个", params: "入门电竞鼠标" }),
  item("MS-G304", "罗技", "G304 无线鼠标", "LIGHTSPEED", "PC-KM", 169, 120, { unit: "个", params: "无线游戏鼠" }),
  item("MS-M590", "罗技", "M590 静音无线", "办公双模", "PC-KM", 149, 105, { unit: "个", params: "办公静音" }),
  item("MS-VIPER", "雷蛇", "毒蝰 V3 有线", "轻量化", "PC-KM", 229, 165, { unit: "个", params: "雷蛇毒蝰" }),
  item("MS-N370", "双飞燕", "N-370FS 有线", "办公对称", "PC-KM", 29, 15, { unit: "个", params: "便宜办公鼠" }),

  // 键盘
  item("KB-K120", "罗技", "K120 有线键盘", "全尺寸防水", "PC-KM", 59, 35, { unit: "个", params: "办公有线键盘" }),
  item("KB-K380", "罗技", "K380 蓝牙键盘", "多设备", "PC-KM", 149, 105, { unit: "个", params: "蓝牙便携" }),
  item("KB-G413", "罗技", "G413 TKL", "机械 紧凑", "PC-KM", 299, 220, { unit: "个", params: "入门机械" }),
  item("KB-HUNTSMAN", "雷蛇", "猎魂光蛛 迷你", "光轴 RGB", "PC-KM", 499, 370, { unit: "个", params: "雷蛇机械" }),
  item("KB-DOUBLE", "双飞燕", "KR-85 有线", "全尺寸", "PC-KM", 39, 18, { unit: "个", params: "便宜键盘" }),

  // 安装服务（对照京东「安装服务」位，不占库存）
  item("SVC-OS", "店内", "装系统 + 驱动", "Windows 正版需另配密钥", "SVC-BUILD", 50, 0, {
    unit: "次",
    isStocked: false,
    canBeBuildPart: false,
    warranty: 0,
    params: "场景：自助装机\n服务：装系统、主板芯片组/显卡驱动",
  }),
  item("SVC-CABLE", "店内", "机箱理线", "装机加收", "SVC-BUILD", 30, 0, {
    unit: "次",
    isStocked: false,
    canBeBuildPart: false,
    warranty: 0,
    params: "海景房理线",
  }),
  item("SVC-HOME-PC", "店内", "上门装机", "市区含搬运显示器", "SVC-VISIT", 120, 0, {
    unit: "次",
    isStocked: false,
    canBeBuildPart: false,
    warranty: 0,
    params: "对照京东库房装机/上门安装",
  }),
];
