import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function MobileHelpPage() {
  return (
    <div className="flex flex-col gap-4 pb-4 text-sm leading-6">
      <p className="text-muted-foreground">出门用手机；进货、报表、月结对账回店用电脑。</p>
      <section className="rounded-xl border bg-card px-3 py-3">
        <h2 className="text-base font-semibold">怎么打开</h2>
        <p className="mt-1">店里打开 https://192.168.10.104 （不要加端口）。第一次证书提示选「高级 → 继续访问」。和电脑同一 WiFi。</p>
        <p className="mt-1 text-muted-foreground">演示账号 owner 或 clerk，密码 123456。</p>
      </section>
      <section className="rounded-xl border bg-card px-3 py-3">
        <h2 className="text-base font-semibold">底栏</h2>
        <ul className="mt-1 list-disc pl-5">
          <li>首页：上门、快捷入口</li>
          <li>客户：搜、打电话、新建现金客户</li>
          <li>工单：开单、暂存、完工</li>
          <li>串号：扫码或手输查保修</li>
          <li>更多：收款、组装、知识库、退出</li>
        </ul>
      </section>
      <section className="rounded-xl border bg-card px-3 py-3">
        <h2 className="text-base font-semibold">扫码</h2>
        <p className="mt-1">点「扫码」打开相机。认不出就手输，或用「拍照」选相册。</p>
      </section>
      <section className="rounded-xl border bg-card px-3 py-3">
        <h2 className="text-base font-semibold">组装配置</h2>
        <p className="mt-1">必须写配件清单。「暂存」不扣库存，「确认出库」才扣配件并生成销售单。</p>
        <Link className={cn(buttonVariants(), "mt-2 h-11")} href="/m/builds">
          打开组装配置
        </Link>
      </section>
      <section className="rounded-xl border bg-card px-3 py-3">
        <h2 className="text-base font-semibold">手机不做</h2>
        <p className="mt-1">采购入库、对账单、报表、设置、完整销售开单、合同工程。需要时在「更多」切电脑版。</p>
      </section>
    </div>
  );
}
