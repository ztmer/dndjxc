import { CustomerForm } from "@/components/forms/customer-form";

export const dynamic = "force-dynamic";

export default function MobileNewCustomerPage() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">姓名必填。只能现金；勾散客则不能改月结。</p>
      <CustomerForm compact afterSaveHref="/m/customers/:id" />
    </div>
  );
}
