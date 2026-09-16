import { item } from "@/lib/product-catalog-item";

/** 打印设备 + 另色鬼等耗材：EPSON、佳能、得实、映美、TSC、Postek、芯烨。 */
export const PRT_CONS_CATALOG = [
  item("PRT-L3251", "EPSON", "L3251 墨仓式", "打印复印扫描 WiFi", "PRT-INK", 1199, 980, {
    unit: "台",
    params: "爱普生墨仓彩喷一体，家用/小微，原装墨水另配",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-L3253", "EPSON", "L3253 墨仓式", "比 3251 稍新", "PRT-INK", 1299, 1050, {
    unit: "台",
    params: "无线墨仓一体机",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-L18050", "EPSON", "L18050 A3 墨仓", "照片/图纸", "PRT-INK", 3999, 3480, {
    unit: "台",
    params: "A3 六色，影楼/设计",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-LQ630K", "EPSON", "LQ-630K 针式", "增值税票/出库单", "PRT-DOT", 1899, 1620, {
    unit: "台",
    params: "24 针，税控/仓库单据，色带另配",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-G3812", "佳能", "G3812 加墨式", "打印复印扫描", "PRT-INK", 1099, 890, {
    unit: "台",
    params: "佳能连供彩喷，家用",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-G5080", "佳能", "G5080 商用加墨", "高速文档", "PRT-INK", 1599, 1280, {
    unit: "台",
    params: "商用加墨，成本低",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-LBP2900", "佳能", "LBP2900+ 激光", "老款黑白，配件还能配", "PRT-LASER", 799, 560, {
    unit: "台",
    params: "USB 激光，硒鼓 303，维修常见",
    trackSerial: true,
    canBeBuildPart: false,
    warranty: 12,
  }),
  item("PRT-DS-2600", "得实", "DS-2600 针式", "营改增/票据", "PRT-DOT", 1699, 1420, {
    unit: "台",
    params: "得实针打，税票仓库",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-DS-1900", "得实", "DS-1900 平推", "证卡/存折类咨询型号", "PRT-DOT", 2199, 1850, {
    unit: "台",
    params: "平推针打，银行/窗口",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-FP-630K", "映美", "FP-630K 针式", "营改增", "PRT-DOT", 1599, 1350, {
    unit: "台",
    params: "映美针打，色带通用注意型号",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-FP-312K", "映美", "FP-312K 针式", "入门票据", "PRT-DOT", 1299, 1080, {
    unit: "台",
    params: "映美入门针打",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-TSC-TE244", "TSC", "TE244 条码机", "203dpi 热敏/热转印", "PRT-LASER", 899, 680, {
    unit: "台",
    params: "桌面条码打印机，碳带+标签纸\n分类暂挂激光类，实为条码机",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-TSC-TE310", "TSC", "TE310 300dpi", "精细条码", "PRT-LASER", 1299, 980, {
    unit: "台",
    params: "300dpi 条码机，小标签更清晰",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-POSTEK-E200", "POSTEK", "E200 条码机", "博思得", "PRT-LASER", 999, 750, {
    unit: "台",
    params: "博思得桌面条码，配件碳带",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-POSTEK-G6000", "POSTEK", "G-6000 工业条码", "工业级", "PRT-LASER", 4599, 3980, {
    unit: "台",
    params: "工业条码机，仓储产线",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-XP58", "芯烨", "XP-58IIH 热敏小票", "58mm", "PRT-LASER", 159, 95, {
    unit: "台",
    params: "收银小票 USB/网口以型号为准",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-XP80", "芯烨", "XP-N160II 80mm", "厨房/前台", "PRT-LASER", 289, 190, {
    unit: "台",
    params: "80mm 热敏，网口厨房打印",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-LIDE300", "佳能", "LIDE 300 扫描仪", "USB 便携", "PRT-SCAN", 399, 290, {
    unit: "台",
    params: "平板扫描，证件/合同",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("PRT-PART-ROLLER", "EPSON", "针打进纸胶辊", "LQ-630K 维修件", "PRT-PART", 45, 18, {
    unit: "个",
    params: "进纸打滑更换胶辊",
    canBeBuildPart: false,
  }),
  item("INK-LG-672", "另色鬼", "672 四色墨水套装", "适配爱普生 L 系列连供", "CONS-INK", 49, 22, {
    unit: "套",
    params: "品牌：另色鬼\n颜色：黑黄青品红\n适用：L360/L380/L325x 等 672 口\n提示：不保原厂喷头质保",
    canBeBuildPart: false,
    warranty: 0,
  }),
  item("INK-LG-003", "另色鬼", "003 墨水四色", "L3153/L3251 等", "CONS-INK", 55, 25, {
    unit: "套",
    params: "另色鬼 003 口，装前核对打印机型号",
    canBeBuildPart: false,
    warranty: 0,
  }),
  item("INK-LG-845", "另色鬼", "845/846 填充墨水", "佳能加墨机", "CONS-INK", 45, 20, {
    unit: "套",
    params: "佳能 G 系列/845 墨盒灌注，勿灌原装芯片盒除非客户知情",
    canBeBuildPart: false,
    warranty: 0,
  }),
  item("INK-LG-955", "另色鬼", "955 填充墨水", "惠普 OfficeJet", "CONS-INK", 59, 28, {
    unit: "套",
    params: "惠普 955 墨盒灌注",
    canBeBuildPart: false,
    warranty: 0,
  }),
  item("INK-LG-UNIVERSAL", "另色鬼", "通用染料黑 100ml", "应急补墨", "CONS-INK", 18, 7, {
    unit: "瓶",
    params: "通用染料黑，混用有堵头风险，要告知客户",
    canBeBuildPart: false,
    warranty: 0,
  }),
  item("RIB-LQ630", "EPSON", "LQ-630K 色带", "原装/兼容备注", "CONS-RIB", 28, 12, {
    unit: "根",
    params: "针打色带架，得实映美不要混用",
    canBeBuildPart: false,
  }),
  item("RIB-DS2600", "得实", "DS-2600 色带", "兼容", "CONS-RIB", 22, 9, {
    unit: "根",
    params: "得实针打色带",
    canBeBuildPart: false,
  }),
  item("RIB-FP630", "映美", "FP-630K 色带", "兼容", "CONS-RIB", 22, 9, {
    unit: "根",
    params: "映美针打色带",
    canBeBuildPart: false,
  }),
  item("TAPE-TSC", "TSC", "110mm×300m 碳带", "热转印", "CONS-RIB", 35, 18, {
    unit: "卷",
    params: "条码碳带，蜡基/混合基要问客户",
    canBeBuildPart: false,
  }),
  item("PAPER-58", "芯烨", "58mm 热敏纸 20 卷", "小票", "CONS-PAPER", 32, 16, {
    unit: "份",
    params: "收银纸 58mm",
    canBeBuildPart: false,
  }),
  item("PAPER-80", "芯烨", "80mm 热敏纸 10 卷", "厨房", "CONS-PAPER", 38, 18, {
    unit: "份",
    params: "80mm 热敏纸",
    canBeBuildPart: false,
  }),
  item("TONER-303", "佳能", "303 硒鼓", "LBP2900", "CONS-DRUM", 89, 45, {
    unit: "个",
    params: "兼容 303 硒鼓，可加粉",
    canBeBuildPart: false,
  }),
];
