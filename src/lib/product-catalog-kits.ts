import { item } from "@/lib/product-catalog-item";
import { DIY_KITS } from "@/lib/build-presets";

/** 整机套餐只进产品目录，不当成一件空「组装机」商品卖。 */
export const KIT_CATALOG = DIY_KITS.map((k) =>
  item(k.code, "店配", k.name, `${k.scene} · ${k.cpu} / ${k.gpu}`, "PC-KIT", k.sale, k.cost, {
    unit: "套",
    inShop: false,
    isStocked: false,
    canBeBuildPart: false,
    trackSerial: false,
    warranty: 12,
    remark: k.remark,
    params: [
      `场景：${k.scene}`,
      `CPU：${k.cpu}`,
      `显卡：${k.gpu}`,
      `主板：${k.mb}`,
      `内存：${k.ram}`,
      `工时：${k.laborFee} 元`,
      `配件编码：${k.parts.map((p) => `${p.slot} ${p.code}`).join("、")}`,
      k.remark,
      "卖出须开组装配置单，禁止只卖空套餐名。",
    ].join("\n"),
  }),
);
