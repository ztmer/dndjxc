import { item } from "@/lib/product-catalog-item";

/** 网络：TP-LINK、水星、锐捷、华为。2007 年起店内还能配到的路由/交换/AP/线材。 */
export const NET_CATALOG = [
  item("NET-WR740", "TP-LINK", "TL-WR740N 百兆无线", "老 150M 路由", "NET-RT", 45, 22, {
    unit: "台",
    params: "Wi-Fi 4 百兆口，老小区还能见到，仅作维修替换",
    warranty: 12,
    canBeBuildPart: false,
  }),
  item("NET-WR842", "TP-LINK", "TL-WR842N", "300M 穿墙", "NET-RT", 69, 38, {
    unit: "台",
    params: "百兆口 300M，小商户备用机",
    canBeBuildPart: false,
  }),
  item("NET-XDR1850", "TP-LINK", "XDR1850 WiFi6", "AX1800 千兆", "NET-RT", 129, 85, {
    unit: "台",
    params: "Wi-Fi 6 AX1800 千兆网口，入门换新",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("NET-XDR5480", "TP-LINK", "XDR5480 WiFi6", "AX5400", "NET-RT", 329, 240, {
    unit: "台",
    params: "游戏加速/多设备，2.5G 口以实机为准",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("NET-SG1005", "TP-LINK", "5 口千兆交换机", "TL-SG1005", "NET-SW", 59, 35, {
    unit: "台",
    params: "非网管 5 口千兆桌面式",
    canBeBuildPart: false,
  }),
  item("NET-SG1024", "TP-LINK", "24 口千兆交换机", "机架式", "NET-SW", 399, 290, {
    unit: "台",
    params: "24 口千兆，弱电箱/监控室",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("NET-EAP225", "TP-LINK", "EAP225 吸顶 AP", "AC1350 企业 AP", "NET-AP", 259, 180, {
    unit: "台",
    params: "POE 供电吸顶，商用 Wi-Fi，需 AC 或 Omada",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("NET-NIC-GB", "TP-LINK", "PCI-E 千兆网卡", "TG-3269", "NET-NIC", 35, 18, {
    unit: "块",
    params: "主板网卡坏了加独立千兆卡",
  }),
  item("NET-FIBER-MOD", "TP-LINK", "千兆光模块", "SFP 1.25G", "NET-FIBER", 49, 25, {
    unit: "个",
    params: "LC 接口，交换机上联光纤",
  }),
  item("NET-RJ45", "TP-LINK", "超五类水晶头 100 个", "镀金", "NET-CABLE", 28, 12, {
    unit: "盒",
    params: "RJ45 8P8C，配网线钳",
    canBeBuildPart: false,
  }),
  item("MER-D12G", "水星", "D12G WiFi6 路由", "AX1500 千兆", "NET-RT", 89, 55, {
    unit: "台",
    params: "水星入门 Wi-Fi 6，家庭换机",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("MER-S105G", "水星", "5 口千兆交换机", "SG105", "NET-SW", 45, 25, {
    unit: "台",
    params: "水星 5 口千兆，价格敏感客户",
    canBeBuildPart: false,
  }),
  item("MER-MW325R", "水星", "MW325R 300M", "四天线穿墙", "NET-RT", 55, 28, {
    unit: "台",
    params: "老 300M 路由，农村宽带还能用",
    canBeBuildPart: false,
  }),
  item("RG-EG105G", "锐捷", "EG105G 企业网关", "5 口千兆", "NET-FW", 399, 290, {
    unit: "台",
    params: "锐捷轻量网关，商户行为管理/认证",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("RG-NBS1810", "锐捷", "10 口千兆交换机", "POE 款需备注", "NET-SW", 459, 330, {
    unit: "台",
    params: "锐捷云管理交换，可配 AP",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("RG-AP180", "锐捷", "AP180 面板 AP", "86 盒 Wi-Fi 6", "NET-AP", 329, 240, {
    unit: "台",
    params: "酒店/办公室面板 AP，POE",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("HW-AX3", "华为", "AX3 WiFi6 路由", "双核 3000M 级", "NET-RT", 219, 160, {
    unit: "台",
    params: "华为路由 AX3，家庭 Mesh 可组网",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("HW-AX6", "华为", "AX6 WiFi6", "7200M 级四核", "NET-RT", 399, 300, {
    unit: "台",
    params: "大户型，支持华为智能家居加速",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("HW-S1730", "华为", "S1730 8 口千兆交换", "企业入门", "NET-SW", 289, 210, {
    unit: "台",
    params: "华为数通入门交换，网管功能以型号为准",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("HW-AP362", "华为", "AP362 吸顶", "Wi-Fi 6 室内", "NET-AP", 599, 450, {
    unit: "台",
    params: "华为室内 AP，需 AC 或云管理",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("HW-ONU", "华为", "HG8145V5 光猫", "运营商回收/替换", "NET-RT", 120, 60, {
    unit: "台",
    params: "GPON 光猫，改桥接前确认运营商绑定",
    trackSerial: true,
    canBeBuildPart: false,
    warranty: 3,
  }),
  item("NET-PDU", "TP-LINK", "8 位 PDU", "机柜电源排", "NET-RACK", 89, 50, {
    unit: "个",
    params: "10A 8 位，监控柜/弱电箱",
    canBeBuildPart: false,
  }),
];
