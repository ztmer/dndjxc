import { CustomerForm } from "@/components/forms/customer-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function NewCustomerPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="新建客户" description="单位客户可填多个上门地点（总部、分厂等）。散客只能现金。" />
      <Card>
        <CardContent className="pt-6">
          <CustomerForm />
        </CardContent>
      </Card>
    </div>
  );
}
