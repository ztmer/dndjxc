import { item } from "@/lib/product-catalog-item";

/** 2007 年起台式机内存：DDR2～DDR5 金士顿走量 + 联想拆机条。不含笔记本专用条。 */
export const RAM_CATALOG = [
  item("RAM-DDR2-1G", "金士顿", "DDR2 1G 800", "PC2-6400 240pin 台式机", "PC-RAM", 25, 10, {
    unit: "条",
    params: "类型：DDR2\n容量：1GB\n频率：800MHz\n电压：1.8V\n适用：775/部分 1156 老板",
    warranty: 12,
  }),
  item("RAM-DDR2-2G", "金士顿", "DDR2 2G 800", "PC2-6400 台式机", "PC-RAM", 40, 18, {
    unit: "条",
    params: "类型：DDR2 2GB 800MHz 1.8V 台式机",
    warranty: 12,
  }),
  item("RAM-DDR3-2G", "金士顿", "DDR3 2G 1333", "PC3-10600 台式机", "PC-RAM", 35, 15, {
    unit: "条",
    params: "类型：DDR3 2GB 1333MHz 1.5V 240pin",
    warranty: 12,
  }),
  item("RAM-DDR3-4G", "金士顿", "DDR3 4G 1600", "KVR16N11/4 台式机", "PC-RAM", 55, 28, {
    unit: "条",
    params: "类型：DDR3 4GB 1600MHz CL11 1.5V\n适用：1155/1150/FM2 办公机",
    warranty: 24,
  }),
  item("RAM-DDR3-8G", "金士顿", "DDR3 8G 1600", "台式机单条", "PC-RAM", 89, 48, {
    unit: "条",
    params: "类型：DDR3 8GB 1600MHz 台式机。双通道插两条。",
    warranty: 24,
  }),
  item("RAM-DDR4-4G", "金士顿", "DDR4 4G 2400", "台式机", "PC-RAM", 69, 38, {
    unit: "条",
    params: "类型：DDR4 4GB 2400 1.2V 288pin",
  }),
  item("RAM-DDR4-8G", "金士顿", "DDR4 8G 2666", "KVR26N19S8/8", "PC-RAM", 99, 58, {
    unit: "条",
    params: "类型：DDR4 8GB 2666 CL19 台式机普条",
  }),
  item("RAM-DDR4-16G-2666", "金士顿", "DDR4 16G 2666 普条", "台式机", "PC-RAM", 169, 110, {
    unit: "条",
    params: "类型：DDR4 16GB 2666 无马甲办公条",
  }),
  item("RAM-DDR5-16G", "金士顿", "DDR5 16G 5600 普条", "台式机", "PC-RAM", 279, 190, {
    unit: "条",
    params: "类型：DDR5 16GB 5600 1.1V 288pin\n适用：AM5 / 12 代以后 DDR5 板",
  }),
  item("RAM-LEN-DDR3-4G", "联想", "拆机 DDR3 4G 1600", "品牌机拆机条", "PC-RAM", 40, 18, {
    unit: "条",
    params: "来源：联想台式机拆机\n类型：DDR3 4GB 1600\n店保：12 个月，不保证原厂保",
    warranty: 12,
  }),
  item("RAM-LEN-DDR4-8G", "联想", "拆机 DDR4 8G 2666", "品牌机拆机条", "PC-RAM", 70, 38, {
    unit: "条",
    params: "来源：联想启天/扬天拆机 DDR4 8GB",
    warranty: 12,
  }),
];
