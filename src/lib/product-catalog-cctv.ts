import { item } from "@/lib/product-catalog-item";

/** 监控：海康、大华、萤石、乐橙、天地伟业。 */
export const CCTV_CATALOG = [
  item("HK-T12H-2", "海康威视", "200 万红外半球", "POE 拾音", "CCTV-IP", 169, 120, {
    unit: "台",
    params: "像素：200 万\n供电：POE/12V\n形态：半球室内\n音频：拾音",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("HK-B12H", "海康威视", "200 万红外枪机", "POE 室外", "CCTV-IP", 199, 140, {
    unit: "台",
    params: "枪机室外防水，POE，红外夜视",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("HK-T34H", "海康威视", "400 万半球", "POE 拾音", "CCTV-IP", 259, 185, {
    unit: "台",
    params: "400 万星光/全彩以具体料号为准",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("HK-PTZ", "海康威视", "400 万球机", "云台变焦", "CCTV-IP", 899, 680, {
    unit: "台",
    params: "网络球机，需注意电源/POE 功率",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("HK-AHD-2", "海康威视", "200 万同轴半球", "模拟 AHD", "CCTV-AHD", 99, 60, {
    unit: "台",
    params: "老模拟系统升级，BNC 同轴",
    canBeBuildPart: false,
  }),
  item("HK-NVR8", "海康威视", "8 路 POE NVR", "DS-7108N", "CCTV-NVR", 499, 370, {
    unit: "台",
    params: "8 路接入，内置 POE，可加硬盘",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("HK-NVR16", "海康威视", "16 路 NVR", "网管型入门", "CCTV-NVR", 899, 680, {
    unit: "台",
    params: "16 路，外接 POE 交换机",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("DH-H2A", "大华", "200 万半球", "POE", "CCTV-IP", 159, 115, {
    unit: "台",
    params: "大华乐橙/大华工程机入门半球",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("DH-G2A", "大华", "200 万枪机", "POE 室外", "CCTV-IP", 189, 135, {
    unit: "台",
    params: "大华室外枪机",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("DH-NVR4", "大华", "4 路 POE NVR", "乐橙协议注意区分工程机", "CCTV-NVR", 299, 220, {
    unit: "台",
    params: "4 路 NVR，硬盘另配",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("DH-NVR8", "大华", "8 路 POE NVR", "工程机", "CCTV-NVR", 469, 350, {
    unit: "台",
    params: "大华 8 路 POE",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("EZVIZ-C6", "萤石", "C6c 云台机", "家用无线", "CCTV-IP", 199, 140, {
    unit: "台",
    params: "萤石 APP，Wi-Fi，需账号，适合家用",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("EZVIZ-C3W", "萤石", "C3W 室外枪机", "全彩 Wi-Fi", "CCTV-IP", 249, 175, {
    unit: "台",
    params: "室外防水，Wi-Fi/有线，萤石云存储可选",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("EZVIZ-W3", "萤石", "W3 室内电池机", "磁吸", "CCTV-IP", 169, 120, {
    unit: "台",
    params: "电池+Wi-Fi，临时看店",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("IMOU-C22", "乐橙", "C22 云台机", "大华消费", "CCTV-IP", 179, 125, {
    unit: "台",
    params: "乐橙 APP，与大华工程协议不要混用",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("IMOU-TA22", "乐橙", "室外枪机", "全彩", "CCTV-IP", 219, 155, {
    unit: "台",
    params: "乐橙室外机",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("TD-IPC", "天地伟业", "200 万半球", "政务/园区常见", "CCTV-IP", 229, 160, {
    unit: "台",
    params: "天地伟业工程机，对接对方平台时确认协议",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("TD-NVR8", "天地伟业", "8 路 NVR", "工程机", "CCTV-NVR", 529, 390, {
    unit: "台",
    params: "天地伟业 NVR",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("CCTV-POE8", "水星", "8 口 POE 交换机", "百兆/千兆备注", "CCTV-POE", 159, 99, {
    unit: "台",
    params: "监控专用 POE，注意单口功率和整机功率",
    canBeBuildPart: false,
  }),
  item("CCTV-POE16", "TP-LINK", "16 口 POE 千兆", "机架", "CCTV-POE", 599, 450, {
    unit: "台",
    params: "16 口 POE，工程用",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("CCTV-PSU12", "海康威视", "12V 监控电源", "2A 单路", "CCTV-PSU", 18, 8, {
    unit: "个",
    params: "12V2A 防水电源，枪机单独供电",
    canBeBuildPart: false,
  }),
  item("CCTV-PSU10", "海康威视", "10 路集中供电", "12V 箱", "CCTV-PSU", 89, 50, {
    unit: "个",
    params: "模拟/小系统集中供电箱",
    canBeBuildPart: false,
  }),
  item("CCTV-BRACKET", "海康威视", "半球支架", "铝合金", "CCTV-CABLE", 15, 6, {
    unit: "个",
    params: "室内半球支架",
    canBeBuildPart: false,
  }),
  item("CCTV-ACS", "海康威视", "人脸门禁一体机", "考勤门禁", "CCTV-ACS", 1299, 980, {
    unit: "台",
    params: "门禁考勤，含安装调试另计工时",
    trackSerial: true,
    canBeBuildPart: false,
  }),
  item("CCTV-ALM", "海康威视", "门磁+声光报警", "配件套", "CCTV-ALM", 89, 45, {
    unit: "套",
    params: "开关量接到 NVR 报警输入",
    canBeBuildPart: false,
  }),
];
