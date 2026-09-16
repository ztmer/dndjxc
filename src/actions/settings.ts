"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertLoggedIn, assertOwner } from "@/lib/require-session";
import { writeAppLog } from "@/lib/app-log";
import {
  isWecomWebhook,
  parseWecomDocTypes,
  renderWecomDocPng,
  sendWecomImage,
  wecomDocLabel,
  type WecomDocType,
} from "@/lib/wecom";
import { renderWorkOrderPng } from "@/lib/work-order-report-png";
import { getShopBiz } from "@/lib/shop-biz";
import { BUILD_SLOTS, type BuildPresetPart } from "@/lib/build-presets";
import { createBackup, restoreBackupFile, safeBackupName, backupDir } from "@/lib/db-backup";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

function revalidateSettings() {
  revalidatePath("/", "layout");
  revalidatePath("/login");
  revalidatePath("/settings");
  revalidatePath("/settings/company");
  revalidatePath("/settings/site");
  revalidatePath("/settings/kits");
  revalidatePath("/settings/backup");
  revalidatePath("/settings/init");
  revalidatePath("/settings/logs");
  revalidatePath("/settings/wecom");
  revalidatePath("/settings/rules");
  revalidatePath("/builds/new");
  revalidatePath("/catalog");
}

export async function loadShopBiz() {
  await assertLoggedIn();
  const row = await getShopBiz();
  return { forceOutboundSn: row.forceOutboundSn, openingMode: row.openingMode };
}

export async function saveShopBiz(input: { forceOutboundSn: boolean; openingMode: boolean }) {
  const user = await assertLoggedIn();
  try {
    await prisma.shopBizSetting.upsert({
      where: { id: "default" },
      create: { id: "default", forceOutboundSn: input.forceOutboundSn, openingMode: input.openingMode },
      update: { forceOutboundSn: input.forceOutboundSn, openingMode: input.openingMode },
    });
    await writeAppLog({
      module: "基本配置",
      action: "保存开单规则",
      detail: [
        input.forceOutboundSn ? "出库强制扫 SN" : "出库可不扫 SN",
        input.openingMode ? "期初录入开" : "期初录入关",
      ].join("；"),
      username: user.username,
    });
    revalidateSettings();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function saveWecomInfo(input: {
  enabled: boolean;
  webhookUrl: string;
  onCreate: boolean;
  onSubmit: boolean;
  mentionAll: boolean;
  docTypes: WecomDocType[];
}) {
  const user = await assertLoggedIn();
  try {
    const webhookUrl = input.webhookUrl.trim();
    if (input.enabled && !isWecomWebhook(webhookUrl)) {
      throw new Error("Webhook 不对。请从企微群机器人原样复制，以 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key= 开头");
    }
    if (webhookUrl && !isWecomWebhook(webhookUrl)) {
      throw new Error("Webhook 格式不对，未保存");
    }
    const types = parseWecomDocTypes(JSON.stringify(input.docTypes));
    if (!types.length) throw new Error("请至少勾选一种单据");
    const data = {
      enabled: input.enabled,
      webhookUrl,
      onCreate: input.onCreate,
      onSubmit: input.onSubmit,
      mentionAll: input.mentionAll,
      docTypes: JSON.stringify(types),
    };
    await prisma.wecomSetting.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
    await writeAppLog({ module: "基本配置", action: "保存企业微信推送", username: user.username });
    revalidateSettings();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function testWecomPush() {
  await assertLoggedIn();
  try {
    const cfg = await prisma.wecomSetting.findUnique({ where: { id: "default" } });
    if (!cfg || !isWecomWebhook(cfg.webhookUrl)) {
      return { ok: false as const, error: "请先填好正确的 Webhook 并保存" };
    }
    const types = parseWecomDocTypes(cfg.docTypes);
    let png!: Buffer;
    let caption = "";
    let logDetail = "样例";
    const pickId = async (type: WecomDocType) => {
      if (type === "workOrder") return (await prisma.workOrder.findFirst({ orderBy: { createdAt: "desc" } }))?.id;
      if (type === "salesOrder" || type === "deliveryNote")
        return (await prisma.salesOrder.findFirst({ orderBy: { createdAt: "desc" } }))?.id;
      if (type === "contract") return (await prisma.contract.findFirst({ orderBy: { createdAt: "desc" } }))?.id;
      return (await prisma.buildConfig.findFirst({ orderBy: { createdAt: "desc" } }))?.id;
    };
    let sent = false;
    for (const type of types) {
      const id = await pickId(type);
      if (!id) continue;
      const r = await renderWecomDocPng(type, id);
      png = r.png;
      caption = `【测试推送】${wecomDocLabel(type)} ${r.docNo}`;
      logDetail = `${wecomDocLabel(type)} ${r.docNo}`;
      sent = true;
      break;
    }
    if (!sent) {
      png = await renderWorkOrderPng({
        shop: "电脑店",
        shopPhone: "",
        title: wecomDocLabel(types[0] ?? "workOrder"),
        docNo: "TEST",
        status: "草稿",
        customer: "测试客户",
        phone: "",
        address: "",
        visit: "上门",
        appointed: "",
        settlement: "现金",
        process: "这是一张测试图，库里还没有对应单据。",
        nextAdvice: "",
        lines: [{ name: "示例配件", unit: "件", qty: "1", price: "0.00", amount: "0.00", flag: "" }],
        total: types[0] === "installSheet" ? "" : "¥0.00",
      });
      caption = "【测试推送】样例图";
    }
    await sendWecomImage(cfg.webhookUrl, png, caption, cfg.mentionAll);
    await writeAppLog({ module: "企业微信", action: "测试推送", detail: logDetail });
    return { ok: true as const, message: "已发到企业微信群，请打开该群查看" };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "发送失败" };
  }
}

export async function saveCompanyInfo(input: {
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  fax?: string;
  legalPerson?: string;
  taxNo?: string;
  bank?: string;
  bankAccount?: string;
}) {
  const user = await assertLoggedIn();
  try {
    if (!input.name.trim()) throw new Error("请填写公司名称");
    const data = {
      name: input.name.trim(),
      phone: input.phone?.trim() ?? "",
      address: input.address?.trim() ?? "",
      email: input.email?.trim() ?? "",
      fax: input.fax?.trim() ?? "",
      legalPerson: input.legalPerson?.trim() ?? "",
      taxNo: input.taxNo?.trim() ?? "",
      bank: input.bank?.trim() ?? "",
      bankAccount: input.bankAccount?.trim() ?? "",
    };
    await prisma.company.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
    await writeAppLog({ module: "基本配置", action: "保存公司信息", username: user.username });
    revalidateSettings();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function saveSiteInfo(input: {
  title: string;
  subtitle?: string;
  copyright?: string;
  icp?: string;
  loginHint?: string;
  wechat?: string;
}) {
  const user = await assertLoggedIn();
  try {
    const data = {
      title: input.title.trim() || "电脑店系统",
      subtitle: input.subtitle?.trim() ?? "",
      copyright: input.copyright?.trim() ?? "",
      icp: input.icp?.trim() ?? "",
      loginHint: input.loginHint?.trim() ?? "",
      wechat: input.wechat?.trim() ?? "",
    };
    await prisma.siteSetting.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
    await writeAppLog({ module: "基本配置", action: "保存网站信息", username: user.username });
    revalidateSettings();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function saveMaintainInfo(input: {
  autoBackupOn: boolean;
  backupEveryDays: number;
  autoCleanLogOn: boolean;
  logKeepDays: number;
}) {
  const user = await assertOwner();
  try {
    const backupEveryDays = Math.min(30, Math.max(1, Math.floor(input.backupEveryDays) || 1));
    const logKeepDays = Math.min(365, Math.max(7, Math.floor(input.logKeepDays) || 90));
    await prisma.maintainSetting.upsert({
      where: { id: "default" },
      create: { id: "default", autoBackupOn: input.autoBackupOn, backupEveryDays, autoCleanLogOn: input.autoCleanLogOn, logKeepDays },
      update: { autoBackupOn: input.autoBackupOn, backupEveryDays, autoCleanLogOn: input.autoCleanLogOn, logKeepDays },
    });
    await writeAppLog({ module: "系统维护", action: "保存自动备份/日志策略", detail: `备份每${backupEveryDays}天；日志留${logKeepDays}天`, username: user.username });
    revalidateSettings();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function runBackupNow() {
  const user = await assertOwner();
  try {
    const name = await createBackup(user.username, "手动备份");
    revalidateSettings();
    return { ok: true as const, name };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "备份失败" };
  }
}

export async function restoreBackup(name: string) {
  const user = await assertOwner();
  try {
    const safe = safeBackupName(name);
    if (!safe) throw new Error("备份文件名无效");
    await restoreBackupFile(path.join(backupDir(), safe), user.username, safe);
    revalidateSettings();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "恢复失败" };
  }
}

export async function restoreUploadedDb(formData: FormData) {
  const user = await assertOwner();
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size < 100) throw new Error("请选择有效的数据库备份文件");
    if (file.size > 80 * 1024 * 1024) throw new Error("备份文件太大");
    const buf = Buffer.from(await file.arrayBuffer());
    await mkdir(backupDir(), { recursive: true });
    const tmp = path.join(backupDir(), `upload-${Date.now()}.db`);
    await writeFile(tmp, buf);
    await restoreBackupFile(tmp, user.username, file.name);
    revalidateSettings();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "恢复失败" };
  }
}

export async function cleanLogsNow(days: number) {
  const user = await assertOwner();
  try {
    const keep = Math.min(365, Math.max(1, Math.floor(days) || 90));
    const cut = new Date(Date.now() - keep * 24 * 60 * 60 * 1000);
    const r = await prisma.appLog.deleteMany({ where: { createdAt: { lt: cut } } });
    await prisma.maintainSetting.upsert({
      where: { id: "default" },
      create: { id: "default", lastLogCleanAt: new Date() },
      update: { lastLogCleanAt: new Date() },
    });
    await writeAppLog({ module: "系统维护", action: "清理日志", detail: `删除 ${r.count} 条（保留 ${keep} 天）`, username: user.username });
    revalidateSettings();
    return { ok: true as const, count: r.count };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "清理失败" };
  }
}

export async function saveDiyKit(input: {
  id?: string;
  code: string;
  name: string;
  scene: string;
  hint?: string;
  laborFee?: string;
  sale?: string;
  cost?: string;
  cpu?: string;
  gpu?: string;
  mb?: string;
  ram?: string;
  remark?: string;
  parts: { slot: string; code: string; qty?: string }[];
  enabled?: boolean;
}) {
  const user = await assertLoggedIn();
  try {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();
    if (!code || !name) throw new Error("编码和名称必填");
    const parts: BuildPresetPart[] = input.parts
      .filter((p) => p.code.trim())
      .map((p) => ({
        slot: ((BUILD_SLOTS as readonly string[]).includes(p.slot) ? p.slot : "CPU") as BuildPresetPart["slot"],
        code: p.code.trim(),
        qty: p.qty?.trim() || undefined,
      }));
    if (!parts.length) throw new Error("至少填一个配件编码");
    const data = {
      code,
      name,
      scene: input.scene.trim() || "家用办公",
      hint: input.hint?.trim() ?? "",
      laborFee: input.laborFee?.trim() || "150",
      sale: Number(input.sale) || 0,
      cost: Number(input.cost) || 0,
      cpu: input.cpu?.trim() ?? "",
      gpu: input.gpu?.trim() ?? "",
      mb: input.mb?.trim() ?? "",
      ram: input.ram?.trim() ?? "",
      remark: input.remark?.trim() ?? "",
      partsJson: JSON.stringify(parts),
      enabled: input.enabled !== false,
    };
    if (input.id) {
      await prisma.diyKit.update({ where: { id: input.id }, data });
    } else {
      await prisma.diyKit.create({ data });
    }
    await writeAppLog({ module: "组装套餐", action: input.id ? "修改套餐" : "新增套餐", detail: name, username: user.username });
    revalidateSettings();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function runSystemInit(opts?: {
  resetBiz?: boolean;
  reset?: { documents?: boolean; customers?: boolean; suppliers?: boolean };
}) {
  const user = await assertOwner();
  try {
    const { runSafeSystemInit } = await import("@/lib/system-init");
    const steps = await runSafeSystemInit({
      resetBiz: !!opts?.resetBiz,
      reset: opts?.reset,
    });
    const clearing = opts?.reset
      ? [
          opts.reset.documents ? "单据" : "",
          opts.reset.customers ? "客户" : "",
          opts.reset.suppliers ? "供应商" : "",
        ].filter(Boolean)
      : opts?.resetBiz
        ? ["单据", "客户"]
        : [];
    await writeAppLog({
      module: "系统维护",
      action: clearing.length ? `清空${clearing.join("、")}并初始化` : "系统初始化",
      detail: steps.map((s) => `${s.name}:${s.detail}`).join("；"),
      username: user.username,
    });
    revalidateSettings();
    revalidatePath("/knowledge");
    revalidatePath("/products/categories");
    revalidatePath("/products/brands");
    revalidatePath("/settings/init");
    revalidatePath("/customers");
    revalidatePath("/suppliers");
    revalidatePath("/sales");
    revalidatePath("/work-orders");
    revalidatePath("/stock");
    return { ok: true as const, steps };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "初始化失败" };
  }
}

export async function deleteDiyKit(id: string) {
  const user = await assertLoggedIn();
  try {
    const row = await prisma.diyKit.findUnique({ where: { id } });
    if (!row) throw new Error("套餐不存在");
    await prisma.diyKit.delete({ where: { id } });
    await writeAppLog({ module: "组装套餐", action: "删除套餐", detail: row.name, username: user.username });
    revalidateSettings();
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "删除失败" };
  }
}
