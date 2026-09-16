"use server";

import { assertLoggedIn } from "@/lib/require-session";

import { prisma } from "@/lib/prisma";
import { d } from "@/lib/money";
import { revalidatePath } from "next/cache";
import { categoryDisplay, ensureProductCategories } from "@/lib/ensure-product-categories";
import { rememberProductBrand } from "@/lib/ensure-product-brands";
import { userCanSeeCost } from "@/lib/auth-shared";

export async function saveCustomer(input: {
  id?: string;
  name: string;
  contactName?: string;
  phone?: string;
  address?: string;
  isWalkIn?: boolean;
  settlement: string;
  remark?: string;
  needInvoice?: boolean;
  invoiceTitle?: string;
  taxNo?: string;
  invoiceBank?: string;
  invoiceAccount?: string;
  invoiceAddress?: string;
  invoicePhone?: string;
  priceMemory?: boolean;
  sites?: { id?: string; name: string; address?: string }[];
}) {
  await assertLoggedIn();

  try {
    if (input.isWalkIn && input.settlement !== "cash") throw new Error("散客不能月结/年结");
    const name = input.name.trim();
    if (!name) throw new Error("请填写名称");
    const needInvoice = !!input.needInvoice;
    const taxNo = (input.taxNo ?? "").trim();
    if (needInvoice && !taxNo) throw new Error("要开发票请填写纳税人识别号");
    const phone = (input.phone ?? "").trim();
    const address = (input.address ?? "").trim();
    const data = {
      name,
      contactName: (input.contactName ?? "").trim(),
      phone,
      address,
      isWalkIn: !!input.isWalkIn,
      settlement: input.settlement,
      remark: (input.remark ?? "").trim(),
      needInvoice,
      invoiceTitle: needInvoice ? (input.invoiceTitle ?? "").trim() || name : (input.invoiceTitle ?? "").trim(),
      taxNo: needInvoice ? taxNo : (input.taxNo ?? "").trim(),
      invoiceBank: (input.invoiceBank ?? "").trim(),
      invoiceAccount: (input.invoiceAccount ?? "").trim(),
      invoiceAddress: (input.invoiceAddress ?? "").trim() || (needInvoice ? address : ""),
      invoicePhone: (input.invoicePhone ?? "").trim() || (needInvoice ? phone : ""),
      priceMemory: !!input.isWalkIn ? false : input.priceMemory !== false,
    };
    const id = await prisma.$transaction(async (tx) => {
      if (input.id) {
        await tx.customer.update({ where: { id: input.id }, data });
        return input.id;
      }
      const count = await tx.customer.count();
      const created = await tx.customer.create({
        data: { ...data, code: `C${String(count + 1).padStart(4, "0")}` },
      });
      return created.id;
    });
    if (input.sites?.length && id) {
      for (const s of input.sites) {
        const name = s.name.trim();
        if (!name) continue;
        if (s.id) {
          await prisma.site.update({
            where: { id: s.id },
            data: { name, address: (s.address ?? "").trim() },
          });
        } else {
          await prisma.site.create({
            data: { customerId: id, name, address: (s.address ?? "").trim() },
          });
        }
      }
    } else if (!input.id && id && address && !input.isWalkIn) {
      await prisma.site.create({
        data: { customerId: id, name: "默认地点", address },
      });
    }
    revalidatePath("/customers");
    if (id) {
      revalidatePath(`/customers/${id}`);
      revalidatePath("/network");
      revalidatePath("/network/devices");
      revalidatePath("/network/ips");
    }
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteCustomerSite(id: string) {
  await assertLoggedIn();
  try {
    const row = await prisma.site.findUnique({ where: { id } });
    if (!row) throw new Error("地点不存在");
    const [wo, pj, assets] = await Promise.all([
      prisma.workOrder.count({ where: { siteId: id } }),
      prisma.project.count({ where: { siteId: id } }),
      prisma.customerAsset.count({ where: { siteId: id } }),
    ]);
    if (wo + pj + assets > 0) {
      throw new Error("这个地点已经挂过工单、工程或设备，不能删。可以改名称。");
    }
    await prisma.site.delete({ where: { id } });
    revalidatePath("/customers");
    revalidatePath(`/customers/${row.customerId}`);
    revalidatePath(`/customers/${row.customerId}/edit`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function saveProduct(input: {
  id?: string;
  code?: string;
  name: string;
  brand?: string;
  spec?: string;
  unit?: string;
  barcode?: string;
  categoryId?: string;
  isStocked: boolean;
  trackSerial: boolean;
  commonSn?: string;
  canBeBuildPart: boolean;
  salePrice: string;
  lastCost?: string;
  saleWarrantyMonths?: string;
  purchaseWarrantyMonths?: string;
  lowStock?: string;
  remark?: string;
  imageUrl?: string;
  enabled?: boolean;
}) {
  const user = await assertLoggedIn();
  const canSeeCost = userCanSeeCost(user);

  try {
    if (!input.isStocked && input.trackSerial) throw new Error("服务商品不能管唯一 SN");
    if (!input.categoryId) throw new Error("请选择商品分类");
    const name = input.name.trim();
    if (!name) throw new Error("请填写商品名称");
    const category = await categoryDisplay(input.categoryId);
    let code = (input.code ?? "").trim();
    if (!code) {
      const n = await prisma.product.count();
      code = `P${String(n + 1).padStart(4, "0")}`;
    } else {
      const clash = await prisma.product.findFirst({
        where: { code, NOT: input.id ? { id: input.id } : undefined },
      });
      if (clash) throw new Error("商品编码已存在");
    }
    const data = {
      code,
      name,
      brand: (input.brand ?? "").trim(),
      spec: (input.spec ?? "").trim(),
      unit: (input.unit ?? "件").trim() || "件",
      barcode: (input.barcode ?? "").trim(),
      category,
      categoryId: input.categoryId,
      isStocked: input.isStocked,
      trackSerial: input.isStocked && input.trackSerial,
      commonSn: (input.commonSn ?? "").trim(),
      canBeBuildPart: input.isStocked && input.canBeBuildPart,
      salePrice: d(input.salePrice),
      lastCost: canSeeCost ? d(input.lastCost ?? 0) : d(0),
      saleWarrantyMonths: Number(input.saleWarrantyMonths ?? 12) || 0,
      purchaseWarrantyMonths: Number(input.purchaseWarrantyMonths ?? 12) || 0,
      lowStock: d(input.lowStock ?? 0),
      remark: (input.remark ?? "").trim(),
      imageUrl: (input.imageUrl ?? "").trim(),
      enabled: input.enabled !== false,
    };
    const catalog = await prisma.catalogSku.findUnique({ where: { code } });
    await rememberProductBrand(data.brand);
    // 只挂目录对照，绝不改 CatalogSku 图文。改售价/名称只写本店商品。
    const id = await prisma.$transaction(async (tx) => {
      if (input.id) {
        const prev = await tx.product.findUnique({ where: { id: input.id } });
        if (!prev) throw new Error("商品不存在");
        const catalogSkuId = prev.catalogSkuId ?? catalog?.id ?? null;
        const { lastCost: nextCost, ...rest } = data;
        await tx.product.update({
          where: { id: input.id },
          data: { ...rest, catalogSkuId, ...(canSeeCost ? { lastCost: nextCost } : {}) },
        });
        return input.id;
      }
      const created = await tx.product.create({
        data: { ...data, catalogSkuId: catalog?.id ?? null },
      });
      return created.id;
    });
    await rememberProductBrand(data.brand);
    revalidatePath("/products");
    revalidatePath("/m/products");
    revalidatePath("/products/brands");
    revalidatePath("/stock");
    revalidatePath(`/products/${id}`);
    revalidatePath(`/m/products/${id}`);
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

/** 只删本店经营档案，不删产品目录。开过单或有库存流水则不能删，请停用。 */
export async function deleteProduct(id: string) {
  await assertLoggedIn();

  try {
    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) throw new Error("商品不存在");
    const [so, sr, po, pr, oi, oo, wo, wr, cfg, ledgers, sns] = await Promise.all([
      prisma.salesOrderLine.count({ where: { productId: id } }),
      prisma.salesReturnLine.count({ where: { productId: id } }),
      prisma.purchaseReceiptLine.count({ where: { productId: id } }),
      prisma.purchaseRequestLine.count({ where: { productId: id } }),
      prisma.otherReceiptLine.count({ where: { productId: id } }),
      prisma.otherIssueLine.count({ where: { productId: id } }),
      prisma.workOrderLine.count({ where: { productId: id } }),
      prisma.workOrderReturnLine.count({ where: { productId: id } }),
      prisma.buildConfigLine.count({ where: { productId: id } }),
      prisma.stockLedger.count({ where: { productId: id } }),
      prisma.serialNumber.count({ where: { productId: id } }),
    ]);
    if (so + sr + po + pr + oi + oo + wo + wr + cfg + ledgers + sns > 0) {
      throw new Error("已经开过单、入过库或有串号，不能删除。请在资料里取消「启用」。产品目录不受影响。");
    }
    const bal = await prisma.stockBalance.aggregate({ where: { productId: id }, _sum: { qty: true } });
    if (Number(bal._sum.qty ?? 0) !== 0) {
      throw new Error("门店还有结存，不能删除。请先出完货或停用。");
    }
    await prisma.$transaction(async (tx) => {
      await tx.stockBalance.deleteMany({ where: { productId: id } });
      await tx.customerProductPrice.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
    revalidatePath("/products");
    revalidatePath("/stock");
    revalidatePath("/catalog");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function saveProductCategory(input: { parentId?: string; name: string }) {
  await assertLoggedIn();

  try {
    const name = input.name.trim();
    if (!name) throw new Error("请填写分类名称");
    const parentId = input.parentId || null;
    const dup = await prisma.productCategory.findFirst({
      where: { parentId, name },
    });
    if (dup) throw new Error("同级已有同名分类");
    const siblings = await prisma.productCategory.count({ where: { parentId } });
    const prefix = parentId
      ? ((await prisma.productCategory.findUnique({ where: { id: parentId } }))?.code ?? "CAT")
      : "CAT";
    const created = await prisma.productCategory.create({
      data: {
        name,
        parentId,
        sort: siblings + 1,
        code: `${prefix}-X${Date.now().toString(36).toUpperCase()}`,
      },
    });
    revalidatePath("/products");
    revalidatePath("/products/categories");
    return { ok: true as const, id: created.id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteProductCategory(id: string) {
  await assertLoggedIn();

  try {
    const node = await prisma.productCategory.findUnique({
      where: { id },
      include: { _count: { select: { children: true, products: true } } },
    });
    if (!node) throw new Error("分类不存在");
    if (node._count.children) throw new Error("请先删除子类");
    if (node._count.products) throw new Error("该分类下还有商品，不能删");
    await prisma.productCategory.delete({ where: { id } });
    revalidatePath("/products");
    revalidatePath("/products/categories");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function restoreDefaultCategories() {
  await assertLoggedIn();

  try {
    await ensureProductCategories();
    revalidatePath("/products");
    revalidatePath("/products/categories");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "写入失败" };
  }
}

export async function saveProductBrand(input: { name: string; remark?: string }) {
  await assertLoggedIn();
  try {
    const name = input.name.trim();
    if (!name) throw new Error("请填写品牌名称");
    const dup = await prisma.productBrand.findUnique({ where: { name } });
    if (dup) throw new Error("已有同名品牌");
    const sort = await prisma.productBrand.count();
    const created = await prisma.productBrand.create({
      data: { name, sort, remark: (input.remark ?? "").trim() },
    });
    revalidatePath("/products");
    revalidatePath("/products/brands");
    return { ok: true as const, id: created.id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteProductBrand(id: string) {
  await assertLoggedIn();
  try {
    const row = await prisma.productBrand.findUnique({ where: { id } });
    if (!row) throw new Error("品牌不存在");
    const used = await prisma.product.count({ where: { brand: row.name } });
    if (used) throw new Error("还有商品用这个品牌，不能删");
    await prisma.productBrand.delete({ where: { id } });
    revalidatePath("/products");
    revalidatePath("/products/brands");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function saveSupplier(input: {
  id?: string;
  name: string;
  contactName?: string;
  phone?: string;
  address?: string;
  remark?: string;
}) {
  await assertLoggedIn();

  try {
    const name = input.name.trim();
    if (!name) throw new Error("请填写名称");
    const data = {
      name,
      contactName: (input.contactName ?? "").trim(),
      phone: (input.phone ?? "").trim(),
      address: (input.address ?? "").trim(),
      remark: (input.remark ?? "").trim(),
    };
    const id = input.id
      ? (await prisma.supplier.update({ where: { id: input.id }, data })).id
      : (await prisma.supplier.create({ data })).id;
    revalidatePath("/suppliers");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteCustomer(id: string) {
  await assertLoggedIn();
  try {
    const row = await prisma.customer.findUnique({ where: { id } });
    if (!row) throw new Error("客户不存在");
    if (row.code === "C0001") throw new Error("系统散客不能删");
    const [so, wo, ct, bc, rc, st, ar, sn, sr] = await Promise.all([
      prisma.salesOrder.count({ where: { customerId: id } }),
      prisma.workOrder.count({ where: { customerId: id } }),
      prisma.contract.count({ where: { customerId: id } }),
      prisma.buildConfig.count({ where: { customerId: id } }),
      prisma.receipt.count({ where: { customerId: id } }),
      prisma.statement.count({ where: { customerId: id } }),
      prisma.arEntry.count({ where: { customerId: id } }),
      prisma.serialNumber.count({ where: { customerId: id } }),
      prisma.salesReturn.count({ where: { customerId: id } }),
    ]);
    if (so + wo + ct + bc + rc + st + ar + sn + sr > 0) {
      throw new Error("这个客户已经开过单，不能单条删除。要整批清请到系统设置 → 系统初始化，勾选客户资料。");
    }
    await prisma.$transaction(async (tx) => {
      await tx.timelineEvent.deleteMany({ where: { customerId: id } });
      await tx.customerAsset.deleteMany({ where: { customerId: id } });
      await tx.customerIpAddr.deleteMany({ where: { customerId: id } });
      await tx.customerNetDevice.deleteMany({ where: { customerId: id } });
      await tx.customerBroadband.deleteMany({ where: { customerId: id } });
      await tx.customerWifi.deleteMany({ where: { customerId: id } });
      await tx.customerProductPrice.deleteMany({ where: { customerId: id } });
      await tx.site.deleteMany({ where: { customerId: id } });
      await tx.customer.delete({ where: { id } });
    });
    revalidatePath("/customers");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function deleteSupplier(id: string) {
  await assertLoggedIn();
  try {
    const row = await prisma.supplier.findUnique({ where: { id } });
    if (!row) throw new Error("供应商不存在");
    const po = await prisma.purchaseReceipt.count({ where: { supplierId: id } });
    if (po) {
      throw new Error("这个供应商有过进货单，不能单条删除。要整批清请到系统设置 → 系统初始化，勾选供应商资料。");
    }
    await prisma.$transaction(async (tx) => {
      await tx.serialNumber.updateMany({ where: { supplierId: id }, data: { supplierId: null } });
      await tx.supplier.delete({ where: { id } });
    });
    revalidatePath("/suppliers");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function savePrintTemplate(input: { id?: string; bizType: string; name: string; html: string; isDefault?: boolean }) {
  await assertLoggedIn();

  try {
    if (input.isDefault) {
      await prisma.printTemplate.updateMany({
        where: { bizType: input.bizType },
        data: { isDefault: false },
      });
    }
    if (input.id) {
      await prisma.printTemplate.update({
        where: { id: input.id },
        data: { name: input.name, html: input.html, isDefault: !!input.isDefault },
      });
    } else {
      await prisma.printTemplate.create({
        data: {
          bizType: input.bizType,
          name: input.name,
          html: input.html,
          isDefault: !!input.isDefault,
        },
      });
    }
    revalidatePath("/print-templates");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function saveReportFormat(input: {
  id?: string;
  bizType: string;
  name: string;
  paper: string;
  configJson: string;
  remark?: string;
  isDefault?: boolean;
}) {
  await assertLoggedIn();

  try {
    const name = input.name.trim();
    if (!name) throw new Error("请填写格式名称");
    const bizType = input.bizType.trim();
    if (!bizType) throw new Error("请选择业务");
    JSON.parse(input.configJson || "{}");
    const paper = input.paper.trim() || "A4";
    if (input.isDefault) {
      await prisma.reportFormat.updateMany({ where: { bizType }, data: { isDefault: false } });
    }
    const data = {
      bizType,
      name,
      paper,
      html: "",
      configJson: input.configJson,
      remark: (input.remark ?? "").trim(),
      isDefault: !!input.isDefault,
    };
    const id = input.id
      ? (await prisma.reportFormat.update({ where: { id: input.id }, data })).id
      : (await prisma.reportFormat.create({ data })).id;
    if (!data.isDefault) {
      const hasDefault = await prisma.reportFormat.findFirst({ where: { bizType, isDefault: true } });
      if (!hasDefault) {
        await prisma.reportFormat.update({ where: { id }, data: { isDefault: true } });
      }
    }
    revalidatePath("/report-formats");
    revalidatePath("/print-templates");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function setReportFormatDefault(id: string) {
  await assertLoggedIn();

  try {
    const row = await prisma.reportFormat.findUnique({ where: { id } });
    if (!row) throw new Error("格式不存在");
    await prisma.reportFormat.updateMany({ where: { bizType: row.bizType }, data: { isDefault: false } });
    await prisma.reportFormat.update({ where: { id }, data: { isDefault: true } });
    revalidatePath("/report-formats");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "操作失败" };
  }
}

export async function deleteReportFormat(id: string) {
  await assertLoggedIn();

  try {
    const row = await prisma.reportFormat.findUnique({ where: { id } });
    if (!row) throw new Error("格式不存在");
    const count = await prisma.reportFormat.count({ where: { bizType: row.bizType } });
    if (count <= 1) throw new Error("每种业务至少保留一份格式");
    await prisma.reportFormat.delete({ where: { id } });
    if (row.isDefault) {
      const next = await prisma.reportFormat.findFirst({ where: { bizType: row.bizType } });
      if (next) await prisma.reportFormat.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    revalidatePath("/report-formats");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function markSerialRma(sn: string) {
  await assertLoggedIn();

  try {
    const row = await prisma.serialNumber.findUnique({ where: { sn } });
    if (!row) throw new Error("串号不存在");
    await prisma.serialNumber.update({
      where: { id: row.id },
      data: { status: "rma", repairCount: { increment: 1 } },
    });
    revalidatePath("/serials");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "更新失败" };
  }
}

export async function saveCustomerAsset(input: {
  customerId: string;
  name: string;
  sn?: string;
  siteId?: string;
  warrantyEnd?: string;
}) {
  await assertLoggedIn();

  try {
    if (!input.name.trim()) throw new Error("请填写设备名称");
    await prisma.customerAsset.create({
      data: {
        customerId: input.customerId,
        name: input.name.trim(),
        sn: (input.sn ?? "").trim(),
        siteId: input.siteId || null,
        warrantyEnd: input.warrantyEnd ? new Date(input.warrantyEnd) : null,
      },
    });
    revalidatePath(`/customers/${input.customerId}`);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function saveCompany(input: { name: string; phone?: string; address?: string }) {
  await assertLoggedIn();

  try {
    await prisma.company.upsert({
      where: { id: "default" },
      create: { id: "default", name: input.name, phone: input.phone ?? "", address: input.address ?? "" },
      update: { name: input.name, phone: input.phone ?? "", address: input.address ?? "" },
    });
    revalidatePath("/settings");
    revalidatePath("/settings/company");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function saveUser(input: {
  username: string;
  password: string;
  displayName: string;
  role: string;
  canSeeCost: boolean;
}) {
  await assertLoggedIn();

  try {
    const username = input.username.trim();
    if (!username || !input.password || !input.displayName.trim()) throw new Error("用户名、密码、姓名必填");
    const { createHash } = await import("crypto");
    const passwordHash = createHash("sha256").update(input.password).digest("hex");
    await prisma.user.create({
      data: {
        username,
        passwordHash,
        displayName: input.displayName.trim(),
        role: input.role === "owner" ? "owner" : "clerk",
        canSeeCost: input.role === "owner" ? true : input.canSeeCost,
      },
    });
    revalidatePath("/settings");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}
