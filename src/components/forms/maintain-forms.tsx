"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cleanLogsNow, restoreBackup, restoreUploadedDb, runBackupNow, saveMaintainInfo } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export function BackupPanel({
  files,
  maintain,
}: {
  files: { name: string; size: number; mtime: string }[];
  maintain: {
    autoBackupOn: boolean;
    backupEveryDays: number;
    lastBackupAt: string | null;
    autoCleanLogOn: boolean;
    logKeepDays: number;
  };
}) {
  const router = useRouter();
  const [autoBackupOn, setAutoBackupOn] = useState(maintain.autoBackupOn);
  const [backupEveryDays, setBackupEveryDays] = useState(String(maintain.backupEveryDays));

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex max-w-lg flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await saveMaintainInfo({
            autoBackupOn,
            backupEveryDays: Number(backupEveryDays),
            autoCleanLogOn: maintain.autoCleanLogOn,
            logKeepDays: maintain.logKeepDays,
          });
          if (r.ok) {
            toast.success("自动备份策略已保存");
            router.refresh();
          } else toast.error(r.error);
        }}
      >
        <p className="text-sm font-medium">自动备份</p>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={autoBackupOn} onCheckedChange={(v) => setAutoBackupOn(!!v)} />
          开启自动备份（有人登录系统时检查是否到期）
        </label>
        <Field>
          <FieldLabel>每隔多少天备份一次</FieldLabel>
          <Input value={backupEveryDays} onChange={(e) => setBackupEveryDays(e.target.value)} />
        </Field>
        <p className="text-xs text-muted-foreground">
          上次备份：{maintain.lastBackupAt ? formatDateTime(new Date(maintain.lastBackupAt)) : "还没有"}
        </p>
        <Button type="submit" variant="outline">
          保存自动备份
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={async () => {
            const r = await runBackupNow();
            if (r.ok) {
              toast.success(`已备份 ${r.name}`);
              router.refresh();
            } else toast.error(r.error);
          }}
        >
          立即备份
        </Button>
        <form
          className="flex items-center gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const r = await restoreUploadedDb(fd);
            if (r.ok) {
              toast.success("已恢复。请刷新页面；若数据异常，让店主重启服务。");
              router.refresh();
            } else toast.error(r.error);
          }}
        >
          <Input name="file" type="file" accept=".db" required />
          <Button type="submit" variant="outline">
            上传恢复
          </Button>
        </form>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>备份文件</TableHead>
            <TableHead>时间</TableHead>
            <TableHead>大小</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                还没有备份。点「立即备份」会把当前库复制到服务器 data/backups。
              </TableCell>
            </TableRow>
          ) : (
            files.map((f) => (
              <TableRow key={f.name}>
                <TableCell className="font-mono text-xs">{f.name}</TableCell>
                <TableCell>{formatDateTime(new Date(f.mtime))}</TableCell>
                <TableCell>{Math.round(f.size / 1024)} KB</TableCell>
                <TableCell className="flex gap-2">
                  <a className="text-sm text-primary" href={`/api/backups/${encodeURIComponent(f.name)}`}>
                    下载
                  </a>
                  <button
                    type="button"
                    className="text-sm text-destructive"
                    onClick={async () => {
                      if (!confirm(`用 ${f.name} 覆盖当前数据？恢复前会再自动备一份。`)) return;
                      const r = await restoreBackup(f.name);
                      if (r.ok) {
                        toast.success("已恢复，请刷新");
                        router.refresh();
                      } else toast.error(r.error);
                    }}
                  >
                    恢复
                  </button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function LogCleanForm({
  maintain,
}: {
  maintain: { autoBackupOn: boolean; backupEveryDays: number; autoCleanLogOn: boolean; logKeepDays: number };
}) {
  const router = useRouter();
  const [days, setDays] = useState(String(maintain.logKeepDays));
  const [autoOn, setAutoOn] = useState(maintain.autoCleanLogOn);

  return (
    <form
      className="flex max-w-lg flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveMaintainInfo({
          autoBackupOn: maintain.autoBackupOn,
          backupEveryDays: maintain.backupEveryDays,
          autoCleanLogOn: autoOn,
          logKeepDays: Number(days),
        });
        if (r.ok) {
          toast.success("日志策略已保存");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={autoOn} onCheckedChange={(v) => setAutoOn(!!v)} />
        定时自动清理（每天登录时检查一次）
      </label>
      <Field>
        <FieldLabel>日志保留天数</FieldLabel>
        <Input value={days} onChange={(e) => setDays(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="outline">
          保存策略
        </Button>
        <Button
          type="button"
          onClick={async () => {
            const r = await cleanLogsNow(Number(days));
            if (r.ok) {
              toast.success(`已删 ${r.count} 条`);
              router.refresh();
            } else toast.error(r.error);
          }}
        >
          立即清理
        </Button>
      </div>
    </form>
  );
}
