import "dotenv/config";
import { createHash } from "crypto";
import { prisma } from "../src/lib/prisma";
import { applyStock, inboundSerials } from "../src/lib/stock";
import { addMonths } from "../src/lib/guards";
import { DEFAULT_TEMPLATES } from "../src/lib/print";
import { defaultLayout } from "../src/lib/report-layout";
import { ensureProductCategories } from "../src/lib/ensure-product-categories";
import { categoryPathLabel } from "../src/lib/product-category-tree";
import { PRODUCT_CATALOG } from "../src/lib/product-catalog";
import { catalogParamsText } from "../src/lib/catalog-filters";
import { ensureKnowledge } from "../src/lib/ensure-knowledge";
import { ensureProductImage } from "../src/lib/ensure-product-image";

function hash(p: string) {
  return createHash("sha256").update(p).digest("hex");
}

async function main() {
  await prisma.company.upsert({
    where: { id: "default" },
    create: { id: "default", name: "电脑店", phone: "" },
    update: {},
  });
  await prisma.warehouse.upsert({
    where: { code: "STORE" },
    create: { code: "STORE", name: "门店仓", isDefault: true },
    update: { isDefault: true },
  });
  await prisma.user.upsert({
    where: { username: "owner" },
    create: {
      username: "owner",
      passwordHash: hash("123456"),
      displayName: "店主",
      role: "owner",
      canSeeCost: true,
    },
    update: {},
  });
  await prisma.user.upsert({
    where: { username: "clerk" },
    create: {
      username: "clerk",
      passwordHash: hash("123456"),
      displayName: "店员",
      role: "clerk",
      canSeeCost: false,
    },
    update: {},
  });

  await prisma.customer.upsert({
    where: { code: "C0001" },
    create: { code: "C0001", name: "散客", isWalkIn: true, settlement: "cash", priceMemory: false },
    update: { priceMemory: false },
  });
  const unit = await prisma.customer.upsert({
    where: { code: "C0002" },
    create: {
      code: "C0002",
      name: "星辰网络",
      contactName: "王经理",
      phone: "13800000000",
      address: "示例路 1 号",
      settlement: "monthly",
      needInvoice: true,
      invoiceTitle: "星辰网络科技有限公司",
      taxNo: "91440300MA5EXAMPLE",
      invoiceBank: "招商银行深圳分行",
      invoiceAccount: "6225880000000000",
      invoiceAddress: "示例路 1 号",
      invoicePhone: "0755-12345678",
    },
    update: {
      contactName: "王经理",
      address: "示例路 1 号",
      needInvoice: true,
      invoiceTitle: "星辰网络科技有限公司",
      taxNo: "91440300MA5EXAMPLE",
      invoiceBank: "招商银行深圳分行",
      invoiceAccount: "6225880000000000",
      invoiceAddress: "示例路 1 号",
      invoicePhone: "0755-12345678",
    },
  });
  await prisma.site.upsert({
    where: { id: "seed-site-1" },
    create: { id: "seed-site-1", customerId: unit.id, name: "总部办公楼", address: "示例路 1 号" },
    update: {},
  });

  await prisma.supplier.upsert({
    where: { id: "seed-sup-1" },
    create: {
      id: "seed-sup-1",
      name: "华强北批发",
      contactName: "李哥",
      phone: "0755-0000000",
      address: "深圳华强北",
      remark: "主板显卡渠道",
    },
    update: {
      contactName: "李哥",
      address: "深圳华强北",
      remark: "主板显卡渠道",
    },
  });

  await ensureProductCategories();

  console.log("写入产品目录与本店商品…");
  for (const p of PRODUCT_CATALOG) {
    const cat = await prisma.productCategory.findUnique({
      where: { code: p.cat },
      include: { parent: true },
    });
    const imageUrl = await ensureProductImage(p.code, p.brand, p.name, p.images);
    const isStocked = p.isStocked !== false;
    const canBeBuildPart = isStocked && (p.canBeBuildPart ?? true);
    const trackSerial = isStocked && !!p.trackSerial;
    const warranty = p.warranty ?? (isStocked ? 36 : 0);
    const extra =
      p.code === "RAM16"
        ? { barcode: "6900000000016" }
        : p.code === "HDD1T"
          ? { barcode: "6900000000017", commonSn: "HDD-GENERIC" }
          : {};
    const category = cat ? categoryPathLabel(cat.name, cat.parent?.name) : "";
    const catalogData = {
      name: p.name,
      brand: p.brand,
      spec: p.spec,
      params: p.params
        ? [p.params, `参考零售价：${p.sale} 元`, `参考进价：${p.cost} 元`, warranty ? `参考保修：${warranty} 个月` : ""]
            .filter(Boolean)
            .join("\n")
        : catalogParamsText({
            spec: p.spec,
            remark: p.remark,
            sale: p.sale,
            cost: p.cost,
            warranty,
            name: p.name,
          }),
      unit: p.unit,
      category,
      categoryId: cat?.id ?? null,
      imageUrl,
      remark: p.remark ?? "",
      suggestedSale: p.sale,
      suggestedCost: p.cost,
      defaultWarrantyMonths: warranty,
      defaultIsStocked: isStocked,
      defaultTrackSerial: trackSerial,
      defaultCanBeBuildPart: canBeBuildPart,
    };
    const sku = await prisma.catalogSku.upsert({
      where: { code: p.code },
      create: { code: p.code, ...catalogData },
      update: catalogData,
    });
    if (p.inShop === false) continue;
    const data = {
      name: p.name,
      brand: p.brand,
      spec: p.spec,
      unit: p.unit,
      category,
      categoryId: cat?.id ?? null,
      catalogSkuId: sku.id,
      isStocked,
      trackSerial,
      canBeBuildPart,
      salePrice: p.sale,
      lastCost: p.cost,
      saleWarrantyMonths: warranty,
      purchaseWarrantyMonths: warranty,
      lowStock: isStocked ? 1 : 0,
      remark: p.remark ?? "",
      imageUrl,
      ...extra,
    };
    const row = await prisma.product.upsert({
      where: { code: p.code },
      create: { code: p.code, ...data },
      update: data,
    });
    if (isStocked && (p.stock ?? 0) > 0) {
      const bal = await prisma.stockBalance.findFirst({ where: { productId: row.id } });
      if (!bal) {
        await prisma.$transaction(async (tx) => {
          await applyStock(tx, {
            productId: row.id,
            qtyDelta: p.stock ?? 0,
            refType: "seed",
            refId: "seed",
            refNo: "SEED",
          });
        });
      }
    }
  }

  for (const t of DEFAULT_TEMPLATES) {
    const exists = await prisma.printTemplate.findFirst({ where: { bizType: t.bizType, name: t.name } });
    if (!exists) {
      await prisma.printTemplate.create({ data: { ...t, isDefault: true } });
    }
  }

  const reportCount = await prisma.reportFormat.count();
  if (reportCount === 0) {
    const old = await prisma.printTemplate.findMany();
    if (old.length) {
      for (const t of old) {
        await prisma.reportFormat.create({
          data: {
            bizType: t.bizType,
            name: t.name,
            html: t.html,
            configJson: JSON.stringify(defaultLayout(t.bizType)),
            isDefault: t.isDefault,
            paper: t.bizType === "deliveryNote" ? "210x140" : t.bizType === "salesOrder" || t.bizType === "receipt" ? "ticket" : "A4",
          },
        });
      }
    }
  }
  for (const t of DEFAULT_TEMPLATES) {
    const exists = await prisma.reportFormat.findFirst({ where: { bizType: t.bizType, name: t.name } });
    if (!exists) {
      const hasDefault = await prisma.reportFormat.findFirst({ where: { bizType: t.bizType, isDefault: true } });
      await prisma.reportFormat.create({
        data: {
          bizType: t.bizType,
          name: t.name,
          html: t.html,
          configJson: JSON.stringify(defaultLayout(t.bizType)),
          paper: t.bizType === "deliveryNote" ? "210x140" : t.bizType === "salesOrder" || t.bizType === "receipt" ? "ticket" : "A4",
          isDefault: !hasDefault,
        },
      });
    }
  }
  for (const r of await prisma.reportFormat.findMany()) {
    if (!r.configJson || r.configJson === "{}") {
      await prisma.reportFormat.update({
        where: { id: r.id },
        data: { configJson: JSON.stringify(defaultLayout(r.bizType)) },
      });
    }
  }

  const hdd = await prisma.product.findUniqueOrThrow({ where: { code: "HDD1T" } });
  const snCount = await prisma.serialNumber.count({ where: { productId: hdd.id } });
  if (snCount === 0) {
    await prisma.$transaction(async (tx) => {
      await inboundSerials(tx, {
        productId: hdd.id,
        sns: ["SN-HDD-001", "SN-HDD-002", "SN-HDD-003"],
        supplierId: "seed-sup-1",
        purchaseDocNo: "SEED",
        purchaseWarranty: addMonths(new Date(), 36),
      });
    });
  }

  await prisma.serialNumber.updateMany({
    where: { productId: hdd.id },
    data: { commonSn: "HDD-GENERIC" },
  });
  const stale = await prisma.serialNumber.findMany({
    where: { productId: hdd.id, OR: [{ inboundAt: null }, { purchaseDocNo: "" }] },
  });
  for (const s of stale) {
    await prisma.serialNumber.update({
      where: { id: s.id },
      data: {
        inboundAt: s.inboundAt ?? new Date(),
        purchaseDocNo: s.purchaseDocNo || "SEED",
        supplierId: s.supplierId ?? "seed-sup-1",
      },
    });
  }

  await ensureKnowledge();

  console.log("种子数据完成。产品目录、本店商品、知识库已写入。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
