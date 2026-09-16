import Link from "next/link";
import { LogoutButton, SwitchShellButton } from "@/components/session-buttons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MobileMorePage() {
  return (
    <div className="flex flex-col gap-3">
      <Link className={cn(buttonVariants(), "h-14")} href="/m/products/new">
        添加商品资料
      </Link>
      <Link className={cn(buttonVariants(), "h-14")} href="/m/receipts/new">
        去收款
      </Link>
      <Link className={cn(buttonVariants({ variant: "outline" }), "h-12")} href="/m/products">
        本店商品列表
      </Link>
      <Link className={cn(buttonVariants({ variant: "outline" }), "h-12")} href="/m/builds">
        组装配置
      </Link>
      <Link className={cn(buttonVariants({ variant: "outline" }), "h-12")} href="/m/help">
        使用说明
      </Link>
      <Link className={cn(buttonVariants({ variant: "outline" }), "h-12")} href="/m/knowledge">
        知识库
      </Link>
      <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">这些请用电脑</p>
        <p className="mt-1">报表、系统设置、打印模板、采购入库和对账单，手机只做提醒，不做完整功能。</p>
      </div>
      <SwitchShellButton device="desktop" label="切换电脑版" className="h-12" />
      <LogoutButton className="h-12" />
    </div>
  );
}
