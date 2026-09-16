"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCustomerAsset } from "@/actions/master";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function AssetForm({
  customerId,
  sites,
}: {
  customerId: string;
  sites: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sn, setSn] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [warrantyEnd, setWarrantyEnd] = useState("");

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveCustomerAsset({ customerId, name, sn, siteId, warrantyEnd });
        if (r.ok) {
          toast.success("已记入设备台账");
          setName("");
          setSn("");
          setWarrantyEnd("");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <FieldGroup className="contents">
        <Field>
          <FieldLabel>设备名称</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="如 前台收银机" />
        </Field>
        <Field>
          <FieldLabel>串号</FieldLabel>
          <Input value={sn} onChange={(e) => setSn(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>点位</FieldLabel>
          <select className="h-8 rounded-lg border bg-background px-2 text-sm" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">不指定</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field>
          <FieldLabel>保修截止</FieldLabel>
          <Input type="date" value={warrantyEnd} onChange={(e) => setWarrantyEnd(e.target.value)} />
        </Field>
      </FieldGroup>
      <div className="sm:col-span-2">
        <Button type="submit">记入台账</Button>
      </div>
    </form>
  );
}
