import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { BackupPanel } from "@/components/forms/maintain-forms";
import { listBackups } from "@/lib/db-backup";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BackupSettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "owner") {
    return <p className="text-sm text-muted-foreground">备份与恢复只有店主能用。</p>;
  }
  const [files, maintain] = await Promise.all([
    listBackups(),
    prisma.maintainSetting.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="备份与恢复" description="备份文件在服务器 data/backups，不同步覆盖店内库。恢复前会先再备一份。" />
      <Card>
        <CardContent className="pt-6">
          <BackupPanel
            files={files.map((f) => ({ name: f.name, size: f.size, mtime: f.mtime.toISOString() }))}
            maintain={{
              autoBackupOn: maintain.autoBackupOn,
              backupEveryDays: maintain.backupEveryDays,
              lastBackupAt: maintain.lastBackupAt?.toISOString() ?? null,
              autoCleanLogOn: maintain.autoCleanLogOn,
              logKeepDays: maintain.logKeepDays,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
