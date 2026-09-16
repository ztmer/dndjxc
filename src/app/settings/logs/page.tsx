import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogCleanForm } from "@/components/forms/maintain-forms";
import { formatDateTime } from "@/lib/format";
import { getSessionUser } from "@/lib/auth";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";

export const dynamic = "force-dynamic";

export default async function LogsSettingsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "owner") {
    return <p className="text-sm text-muted-foreground">系统日志只有店主能看。</p>;
  }
  const { page: pageRaw } = await searchParams;
  const total = await prisma.appLog.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const [rows, maintain] = await Promise.all([
    prisma.appLog.findMany({ orderBy: { createdAt: "desc" }, skip, take }),
    prisma.maintainSetting.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="系统日志" description="登录、改套餐、备份恢复会记下来。可按天数定时清理，也可立即清理。" />
      <Card>
        <CardHeader>
          <CardTitle>清理策略</CardTitle>
        </CardHeader>
        <CardContent>
          <LogCleanForm
            maintain={{
              autoBackupOn: maintain.autoBackupOn,
              backupEveryDays: maintain.backupEveryDays,
              autoCleanLogOn: maintain.autoCleanLogOn,
              logKeepDays: maintain.logKeepDays,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>模块</TableHead>
                <TableHead>动作</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>说明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    还没有日志。
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell>{r.module || "—"}</TableCell>
                    <TableCell>{r.action}</TableCell>
                    <TableCell>{r.username || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.detail}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <ListPager path="/settings/logs" page={page} total={total} />
        </CardContent>
      </Card>
    </div>
  );
}
