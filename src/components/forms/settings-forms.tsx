"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveCompanyInfo, saveSiteInfo } from "@/actions/settings";
import { saveUser as saveUserMaster } from "@/actions/master";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type Company = {
  name: string;
  phone: string;
  address: string;
  email?: string;
  fax?: string;
  legalPerson?: string;
  taxNo?: string;
  bank?: string;
  bankAccount?: string;
  logoFile?: string;
  sealFile?: string;
};

export function CompanyForm({ company }: { company?: Company | null }) {
  const router = useRouter();
  const [name, setName] = useState(company?.name ?? "电脑店");
  const [phone, setPhone] = useState(company?.phone ?? "");
  const [address, setAddress] = useState(company?.address ?? "");
  const [email, setEmail] = useState(company?.email ?? "");
  const [fax, setFax] = useState(company?.fax ?? "");
  const [legalPerson, setLegalPerson] = useState(company?.legalPerson ?? "");
  const [taxNo, setTaxNo] = useState(company?.taxNo ?? "");
  const [bank, setBank] = useState(company?.bank ?? "");
  const [bankAccount, setBankAccount] = useState(company?.bankAccount ?? "");

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveCompanyInfo({ name, phone, address, email, fax, legalPerson, taxNo, bank, bankAccount });
        if (r.ok) {
          toast.success("公司信息已保存");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <FieldGroup>
        <BrandUpload kind="logo" label="公司 Logo" hint="登录页、侧栏、打印单据都会用" hasFile={!!company?.logoFile} />
        <BrandUpload kind="seal" label="公章" hasFile={!!company?.sealFile} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>公司名称</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field>
            <FieldLabel>法人</FieldLabel>
            <Input value={legalPerson} onChange={(e) => setLegalPerson(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>电话</FieldLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>传真</FieldLabel>
            <Input value={fax} onChange={(e) => setFax(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>邮箱</FieldLabel>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>税号</FieldLabel>
            <Input value={taxNo} onChange={(e) => setTaxNo(e.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>地址</FieldLabel>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>开户银行</FieldLabel>
            <Input value={bank} onChange={(e) => setBank(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>银行账号</FieldLabel>
            <Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
          </Field>
        </div>
      </FieldGroup>
      <Button type="submit">保存公司信息</Button>
    </form>
  );
}

function BrandUpload({ kind, label, hint, hasFile }: { kind: "logo" | "seal"; label: string; hint?: string; hasFile: boolean }) {
  const router = useRouter();
  const [preview, setPreview] = useState(hasFile ? `/api/company-brand/${kind}?t=${Date.now()}` : "");
  return (
    <Field>
      <FieldLabel>{label}{hint ? `（${hint}）` : "（打印送货单 / 对账单 / 合同用）"}</FieldLabel>
      <div className="flex flex-wrap items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="h-16 w-16 rounded-lg border object-contain bg-white" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border text-xs text-muted-foreground">未传</div>
        )}
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const fd = new FormData();
            fd.set("kind", kind);
            fd.set("file", file);
            const res = await fetch("/api/company-brand", { method: "POST", body: fd });
            const j = (await res.json()) as { error?: string; url?: string };
            if (!res.ok) {
              toast.error(j.error || "上传失败");
              return;
            }
            toast.success(`${label}已上传`);
            setPreview(`${j.url}?t=${Date.now()}`);
            router.refresh();
          }}
        />
        {preview ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              const res = await fetch(`/api/company-brand?kind=${kind}`, { method: "DELETE" });
              if (!res.ok) {
                toast.error("删除失败");
                return;
              }
              setPreview("");
              toast.success("已去掉");
              router.refresh();
            }}
          >
            去掉
          </Button>
        ) : null}
      </div>
    </Field>
  );
}

export function SiteForm({
  site,
}: {
  site?: { title: string; subtitle: string; copyright: string; icp: string; loginHint: string; wechat: string } | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(site?.title ?? "电脑店系统");
  const [subtitle, setSubtitle] = useState(site?.subtitle ?? "");
  const [copyright, setCopyright] = useState(site?.copyright ?? "");
  const [icp, setIcp] = useState(site?.icp ?? "");
  const [loginHint, setLoginHint] = useState(site?.loginHint ?? "");
  const [wechat, setWechat] = useState(site?.wechat ?? "");

  return (
    <form
      className="flex max-w-2xl flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveSiteInfo({ title, subtitle, copyright, icp, loginHint, wechat });
        if (r.ok) {
          toast.success("网站信息已保存");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>网站名称</FieldLabel>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="登录页和侧栏显示" />
        </Field>
        <Field>
          <FieldLabel>副标题</FieldLabel>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="浏览器说明、登录页小字" />
        </Field>
        <Field>
          <FieldLabel>登录提示</FieldLabel>
          <Input value={loginHint} onChange={(e) => setLoginHint(e.target.value)} placeholder="登录页底部说明" />
        </Field>
        <Field>
          <FieldLabel>微信号 / 客服</FieldLabel>
          <Input value={wechat} onChange={(e) => setWechat(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>版权信息</FieldLabel>
          <Input value={copyright} onChange={(e) => setCopyright(e.target.value)} placeholder="© 石湾焯智电脑" />
        </Field>
        <Field>
          <FieldLabel>备案号</FieldLabel>
          <Input value={icp} onChange={(e) => setIcp(e.target.value)} />
        </Field>
      </FieldGroup>
      <Button type="submit">保存网站信息</Button>
    </form>
  );
}

export function UserForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("clerk");
  const [canSeeCost, setCanSeeCost] = useState(false);

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveUserMaster({ username, password, displayName, role, canSeeCost });
        if (r.ok) {
          toast.success("已添加用户");
          setUsername("");
          setPassword("");
          setDisplayName("");
          router.refresh();
        } else toast.error(r.error);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>登录名</FieldLabel>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>密码</FieldLabel>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>姓名</FieldLabel>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel>角色</FieldLabel>
          <select className="h-8 rounded-lg border bg-background px-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="clerk">店员</option>
            <option value="owner">店主</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={role === "owner" || canSeeCost} onCheckedChange={(v) => setCanSeeCost(!!v)} disabled={role === "owner"} />
          可看进价（店主默认可以）
        </label>
      </FieldGroup>
      <Button type="submit">添加用户</Button>
    </form>
  );
}
