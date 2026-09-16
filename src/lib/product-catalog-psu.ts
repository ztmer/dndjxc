import { item } from "@/lib/product-catalog-item";

/** 长城电源全线（2007 年起店内还能碰到的额定功率）+ 光驱/扩展卡。 */
export const PSU_MISC_CATALOG = [
  item("PSU-GW-300", "长城", "HOPE 300 额定 300W", "老办公机 20+4pin", "PC-PSU", 99, 55, {
    unit: "个",
    params: "品牌：长城\n额定：300W\n接口：20+4pin，部分老线材\n用途：775/双核办公，带不动独显",
    warranty: 12,
  }),
  item("PSU-GW-400", "长城", "HOPE 400 额定 400W", "静音版", "PC-PSU", 129, 75, {
    unit: "个",
    params: "额定 400W，核显/GT 系够用",
    warranty: 24,
  }),
  item("PSU-GW-450", "长城", "HOPE 450 额定 450W", "铜牌入门", "PC-PSU", 169, 110, {
    unit: "个",
    params: "额定 450W 80PLUS 白牌/铜牌，办公+低端独显",
    warranty: 36,
  }),
  item("PSU-GW-550", "长城", "额定 550W 铜牌", "HOPE 系列", "PC-PSU", 219, 150, {
    unit: "个",
    params: "长城 550W 铜牌，对应办公套餐档。本店常用编码也可选 PSU-550 航嘉。",
    warranty: 36,
  }),
  item("PSU-GW-650", "长城", "G6 650W 金牌", "全模组 ATX", "PC-PSU", 399, 290, {
    unit: "个",
    params: "额定 650W 金牌，可带 RTX 4060 / 3060",
    warranty: 60,
  }),
  item("PSU-GW-750", "长城", "G6 750W 金牌", "全模组", "PC-PSU", 499, 360, {
    unit: "个",
    params: "额定 750W 金牌，游戏主机",
    warranty: 60,
  }),
  item("PSU-GW-850", "长城", "G6 850W 金牌", "全模组 ATX3", "PC-PSU", 599, 440, {
    unit: "个",
    params: "额定 850W，4070 档",
    warranty: 60,
  }),
  item("PSU-GW-1000", "长城", "猎金部落 1000W 金牌", "全模组", "PC-PSU", 799, 590, {
    unit: "个",
    params: "额定 1000W，高功耗显卡",
    warranty: 60,
  }),
  item("ODD-DVD", "联想", "DVD 光驱 SATA", "品牌机拆机/盒装", "PC-ODD", 60, 30, {
    unit: "个",
    params: "接口：SATA 5.25 英寸光驱位\n用途：装系统、读光盘",
    warranty: 12,
    canBeBuildPart: true,
  }),
  item("ODD-USB", "绿联", "外置 USB DVD", "USB3.0 便携", "PC-ODD", 89, 55, {
    unit: "个",
    params: "笔记本没光驱时用，USB 供电",
    canBeBuildPart: false,
  }),
  item("CARD-USB3", "绿联", "PCI-E USB3.0 扩展卡", "四口", "PC-CARD", 49, 25, {
    unit: "块",
    params: "给老主板加 USB3，需空闲 PCI-E 插槽",
  }),
  item("CARD-COM", "绿联", "PCI-E 串口卡", "工控/税控", "PC-CARD", 69, 38, {
    unit: "块",
    params: "RS232 串口，针式税控、工控机常用",
  }),
];
