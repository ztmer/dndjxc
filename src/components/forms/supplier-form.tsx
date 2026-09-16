"use client";

import { useState } from "react";
import { saveSupplier, deleteSupplier } from "@/actions/master";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function SupplierForm({
  supplier,
}: {
  supplier?: {
    id: string;
    name: string;
    contactName: string;
    phone: string;
    address: string;
    remark: string;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(supplier?.name ?? "");
  const [contactName, setContactName] = useState(supplier?.contactName ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [remark, setRemark] = useState(supplier?.remark ?? "");

  return (
    <form
      key={supplier?.id ?? "new"}
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveSupplier({
          id: supplier?.id,
          name,
          contactName,
          phone,
          address,
          remark,
        });
        if (r.ok) {
          toast.success("已保存");
          setName("");
          setContactName("");
          setPhone("");
          setAddress("");
          setRemark("");
          router.push("/suppliers");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <FieldGroup>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel>名称</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="批发商名称" />
          </Field>
          <Field>
            <FieldLabel>联系人</FieldLabel>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>电话</FieldLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>地址</FieldLabel>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>备注</FieldLabel>
            <Textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} />
          </Field>
        </div>
      </FieldGroup>
      <div className="flex gap-2">
        <Button type="submit">{supplier ? "保存修改" : "新增"}</Button>
        {supplier ? (
          <Button
            type="button"
            variant="destructive"
            onClick={async () => {
              if (!confirm(`删除供应商「${supplier.name}」？有过进货单的不能删，请到系统初始化里勾选供应商资料。`)) return;
              const r = await deleteSupplier(supplier.id);
              if (r.ok) {
                toast.success("已删除");
                router.push("/suppliers");
                router.refresh();
              } else toast.error(r.error);
            }}
          >
            删除
          </Button>
        ) : null}
        {supplier ? (
          <Button type="button" variant="outline" onClick={() => router.push("/suppliers")}>
            取消
          </Button>
        ) : null}
      </div>
    </form>
  );
}
