import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { writeAppLog } from "@/lib/app-log";

const NAME = /^\d{8}-\d{6}\.db$/;

export function backupDir() {
  return path.join(process.cwd(), "data", "backups");
}

export function sqlitePath() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const file = url.replace(/^file:/, "").trim();
  return path.isAbsolute(file) ? file : path.join(process.cwd(), file.replace(/^\.\//, ""));
}

export function backupFileName(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.db`;
}

export function safeBackupName(name: string) {
  const base = path.basename(name);
  if (!NAME.test(base)) return null;
  return base;
}

export async function listBackups() {
  await fs.mkdir(backupDir(), { recursive: true });
  const names = await fs.readdir(backupDir());
  const rows = await Promise.all(
    names
      .filter((n) => NAME.test(n))
      .map(async (name) => {
        const st = await fs.stat(path.join(backupDir(), name));
        return { name, size: st.size, mtime: st.mtime };
      }),
  );
  return rows.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

export async function createBackup(username: string, reason = "手动备份") {
  const src = sqlitePath();
  await fs.mkdir(backupDir(), { recursive: true });
  const name = backupFileName();
  const dest = path.join(backupDir(), name);
  await fs.copyFile(src, dest);
  await prisma.maintainSetting.upsert({
    where: { id: "default" },
    create: { id: "default", lastBackupAt: new Date() },
    update: { lastBackupAt: new Date() },
  });
  await writeAppLog({ module: "系统维护", action: "数据备份", detail: `${name}（${reason}）`, username });
  const all = await listBackups();
  for (const old of all.slice(30)) {
    await fs.unlink(path.join(backupDir(), old.name)).catch(() => undefined);
  }
  return name;
}

export async function restoreBackupFile(filePath: string, username: string, label: string) {
  const srcDb = sqlitePath();
  await createBackup(username, "恢复前自动备份");
  await fs.copyFile(filePath, srcDb);
  await writeAppLog({ module: "系统维护", action: "数据恢复", detail: label, username, level: "warn" });
}

export async function maybeAutoMaintain() {
  try {
    const st = await prisma.maintainSetting.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
    const now = Date.now();
    if (st.autoBackupOn) {
      const last = st.lastBackupAt?.getTime() ?? 0;
      const due = now - last >= st.backupEveryDays * 24 * 60 * 60 * 1000;
      if (due) await createBackup("系统", `每${st.backupEveryDays}天自动备份`);
    }
    if (st.autoCleanLogOn) {
      const last = st.lastLogCleanAt?.getTime() ?? 0;
      const due = now - last >= 24 * 60 * 60 * 1000;
      if (due) {
        const cut = new Date(now - st.logKeepDays * 24 * 60 * 60 * 1000);
        await prisma.appLog.deleteMany({ where: { createdAt: { lt: cut } } });
        await prisma.maintainSetting.update({ where: { id: "default" }, data: { lastLogCleanAt: new Date() } });
      }
    }
  } catch {
    /* 首次推表前忽略 */
  }
}
