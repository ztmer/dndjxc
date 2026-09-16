import { prisma } from "@/lib/prisma";

export type SiteBrand = {
  title: string;
  logoSrc: string;
};

export async function getSiteBrand(): Promise<SiteBrand> {
  const [site, company] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { id: "default" } }).catch(() => null),
    prisma.company.findUnique({ where: { id: "default" }, select: { logoFile: true } }).catch(() => null),
  ]);
  const title = site?.title?.trim() || "电脑店系统";
  const logoFile = company?.logoFile?.trim() || "";
  return {
    title,
    logoSrc: logoFile ? `/api/company-brand/logo?v=${encodeURIComponent(logoFile)}` : "",
  };
}
