import { item } from "@/lib/product-catalog-item";

/** 联想台式机 / 笔记本整机及维修件（电池、屏、键盘、适配器）。 */
export const LENOVO_CATALOG = [
  item("LEN-YANGTIAN", "联想", "扬天 M4000q 商用主机", "i5 12 代 16G 512G 无屏", "BRAND-DT", 3299, 2890, {
    unit: "台",
    params: "品牌：联想扬天\n形态：品牌台式机\n配置参考：i5-12400 16G 512G\n管 SN",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("LEN-KAIYANG", "联想", "开天商用主机", "国产化/政企常见", "BRAND-DT", 3599, 3100, {
    unit: "台",
    params: "政企开天系列，配置以实机为准，必录 SN",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("LEN-AIO", "联想", "启天一体机 23.8", "i5 16G 512G", "BRAND-AIO", 4499, 3980, {
    unit: "台",
    params: "23.8 英寸一体机，前台收银/办公",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("LEN-P348", "联想", "ThinkStation P348", "入门工作站", "BRAND-WS", 7999, 7200, {
    unit: "台",
    params: "联想工作站，ECC/专业卡以配置单为准",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("NB-ZHAOYANG", "联想", "昭阳 E5 商务本", "i5 16G 512G 15.6", "NB-UNIT", 4599, 4100, {
    unit: "台",
    params: "商务本，接口全，适合单位采购",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("NB-THINK-E14", "联想", "ThinkPad E14", "i5 16G 512G 14 英寸", "NB-UNIT", 5299, 4780, {
    unit: "台",
    params: "ThinkPad E 系列，小红点，差旅办公",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("NB-BAT-Y7000", "联想", "拯救者系列电池", "内置锂电池 维修件", "NB-BAT", 280, 160, {
    unit: "块",
    params: "适用拯救者 Y7000/R7000 等，装前核对电压容量\n店保 6 个月",
    warranty: 6,
    canBeBuildPart: false,
  }),
  item("NB-BAT-XIAOXIN", "联想", "小新系列电池", "内置锂电池", "NB-BAT", 220, 120, {
    unit: "块",
    params: "小新 Air/14 常见电池，核对型号再装",
    warranty: 6,
    canBeBuildPart: false,
  }),
  item("NB-LCD-156", "联想", "15.6 寸 30pin 屏幕", "FHD 普通色域 维修件", "NB-LCD", 320, 180, {
    unit: "块",
    params: "接口：30pin eDP\n分辨率：1920×1080\n装前核对排线方向与厚度",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("NB-LCD-14", "联想", "14 寸 30pin 屏幕", "FHD 维修件", "NB-LCD", 350, 200, {
    unit: "块",
    params: "小新/ThinkPad 14 寸常见屏，核对 EDP 针脚",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("NB-KB-15", "联想", "15.6 寸内置键盘", "国行带背光/无背光需备注", "NB-KB", 90, 45, {
    unit: "个",
    params: "拯救者/小新 15 寸键盘，分带灯不带灯、小回车大回车",
    canBeBuildPart: false,
  }),
  item("NB-ADP-170", "联想", "170W 方口适配器", "拯救者游戏本", "NB-ADP", 189, 110, {
    unit: "个",
    params: "功率：170W 或 230W 需核对\n接口：方口 USB-C 不要混用",
    canBeBuildPart: false,
  }),
  item("NB-ADP-65", "联想", "65W USB-C 适配器", "小新/ThinkPad", "NB-ADP", 129, 75, {
    unit: "个",
    params: "PD 65W Type-C，轻薄本",
    canBeBuildPart: false,
  }),
  item("NB-UPG-16G", "联想", "笔记本升级内存 16G DDR4", "SODIMM", "NB-UPG", 199, 130, {
    unit: "条",
    params: "笔记本条 DDR4 16G 2666/3200，先查能插几根",
    trackSerial: true,
  }),
  item("NB-ACC-COOL", "联想", "笔记本散热底座", "USB 风扇", "NB-ACC", 69, 35, {
    unit: "个",
    params: "垫高+风扇，缓解游戏本高温",
    canBeBuildPart: false,
  }),
];
