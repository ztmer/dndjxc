import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserForm } from "@/components/forms/settings-forms";
import { EmptyHint } from "@/components/empty-hint";
import { Badge } from "@/components/ui/badge";
import { UiSchemeSettings } from "@/components/ui-scheme-settings";
import { listPageState } from "@/lib/list-page";
import { ListPager } from "@/components/list-pager";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageRaw } = await searchParams;
  const total = await prisma.user.count();
  const { page, skip, take } = listPageState(pageRaw, total);
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, skip, take });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="系统设置" description="基本配置：公司、网站、套餐、企业微信。维护：备份恢复、日志。" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/settings/company", title: "公司信息", desc: "打印抬头、税号、开户行" },
          { href: "/settings/site", title: "网站信息", desc: "标题、登录提示、版权" },
          { href: "/settings/kits", title: "组装套餐", desc: "新建配置里增改删套餐" },
          { href: "/settings/wecom", title: "企业微信", desc: "销售/工单/送货/合同/装机单推送到群" },
          { href: "/settings/rules", title: "开单规则", desc: "扫 SN、期初补旧单" },
          { href: "/settings/init", title: "系统初始化", desc: "补默认仓、分类、知识库，不清业务数据" },
          { href: "/settings/backup", title: "备份与恢复", desc: "手动备份、上传恢复、自动备份" },
          { href: "/settings/logs", title: "系统日志", desc: "查看、定时清理、立即清理" },
        ].map((x) => (
          <Link key={x.href} href={x.href}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{x.title}</CardTitle>
                <CardDescription>{x.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <UiSchemeSettings />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>添加用户</CardTitle>
            <CardDescription>店主可看进价；店员默认看不到进价</CardDescription>
          </CardHeader>
          <CardContent>
            <UserForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>现有用户</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {total === 0 ? (
              <div className="p-6">
                <EmptyHint title="还没有用户" hint="先加一个店主账号。" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>登录名</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>进价</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.displayName}</TableCell>
                      <TableCell>{u.role === "owner" ? "店主" : "店员"}</TableCell>
                      <TableCell>
                        {u.canSeeCost || u.role === "owner" ? <Badge>可见</Badge> : <Badge variant="secondary">隐藏</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <ListPager path="/settings" page={page} total={total} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
