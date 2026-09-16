import { item } from "@/lib/product-catalog-item";

/** 机械盘 + 固态：2007 年起维修店常见容量。 */
export const STORAGE_CATALOG = [
  item("HDD-500G", "希捷", "酷鱼 500G 7200转", "3.5 SATA 老办公盘", "PC-HDD", 80, 40, {
    unit: "块",
    params: "接口：SATA 3.5\n容量：500GB\n转速：7200\n用途：老主机系统盘/备份",
    warranty: 12,
    trackSerial: true,
  }),
  item("HDD-2T", "西数", "蓝盘 2TB 7200转", "WD20EZAZ 3.5 SATA", "PC-HDD", 399, 300, {
    unit: "块",
    params: "接口：SATA 3.5 英寸\n容量：2TB\n缓存：256MB\n用途：资料盘",
    warranty: 24,
    trackSerial: true,
  }),
  item("HDD-4T", "希捷", "酷鱼 4TB", "ST4000DM004 3.5 SATA", "PC-HDD", 599, 450, {
    unit: "块",
    params: "容量：4TB 5400/5900 转资料盘，不适合高强度监控",
    warranty: 24,
    trackSerial: true,
  }),
  item("SSD-SATA-128", "金士顿", "A400 120G SATA", "2.5 英寸", "PC-SSD", 79, 48, {
    unit: "块",
    params: "接口：SATA 2.5\n容量：120/128G 级\n用途：老机升级系统盘",
    warranty: 36,
  }),
  item("SSD-SATA-256", "金士顿", "A400 240G SATA", "2.5 英寸", "PC-SSD", 119, 75, {
    unit: "块",
    params: "SATA 固态 240G，H61 以后都能认",
    warranty: 36,
  }),
  item("SSD-SATA-512", "西数", "蓝盘 SA510 500G SATA", "2.5 英寸", "PC-SSD", 229, 160, {
    unit: "块",
    params: "SATA 500G，笔记本/台式机通用 2.5 盒",
    warranty: 36,
  }),
  item("SSD-NVME-256", "西数", "SN580 250G NVMe", "PCIe 4.0 2280", "PC-SSD", 149, 99, {
    unit: "块",
    params: "接口：M.2 NVMe 2280\n注意：老 H61 无 M.2",
    warranty: 36,
  }),
];
