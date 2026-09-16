import fs from "fs/promises";
import path from "path";

export const COMPANY_BRAND_KINDS = ["logo", "seal"] as const;
export type CompanyBrandKind = (typeof COMPANY_BRAND_KINDS)[number];

const NAME_OK = /^(logo|seal)\.(png|jpe?g|webp)$/i;

export function companyBrandDir() {
  return path.join(process.cwd(), "data", "company");
}

export function companyBrandPath(fileName: string) {
  const base = path.basename(fileName);
  if (!NAME_OK.test(base)) throw new Error("图片文件名无效");
  return path.join(companyBrandDir(), base);
}

export function sniffImage(buf: Buffer): { ext: "png" | "jpg" | "webp"; mime: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (buf[0] === 0xff && buf[1] === 0xd8) return { ext: "jpg", mime: "image/jpeg" };
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export async function saveCompanyBrand(kind: CompanyBrandKind, buf: Buffer) {
  const sniffed = sniffImage(buf);
  if (!sniffed) throw new Error("请上传 PNG / JPG / WebP 图片");
  const fileName = `${kind}.${sniffed.ext}`;
  await fs.mkdir(companyBrandDir(), { recursive: true });
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    try {
      await fs.unlink(path.join(companyBrandDir(), `${kind}.${ext}`));
    } catch {
      /* 没有旧文件 */
    }
  }
  await fs.writeFile(companyBrandPath(fileName), buf);
  return { fileName, mime: sniffed.mime };
}

export async function readCompanyBrandFile(fileName: string) {
  if (!fileName || !NAME_OK.test(path.basename(fileName))) return null;
  try {
    const buf = await fs.readFile(companyBrandPath(fileName));
    const sniffed = sniffImage(buf);
    return { buf, mime: sniffed?.mime || "image/png" };
  } catch {
    return null;
  }
}

export async function deleteCompanyBrand(kind: CompanyBrandKind) {
  for (const ext of ["png", "jpg", "jpeg", "webp"]) {
    try {
      await fs.unlink(path.join(companyBrandDir(), `${kind}.${ext}`));
    } catch {
      /* 没有旧文件 */
    }
  }
}

export async function companyBrandDataUri(fileName: string) {
  const file = await readCompanyBrandFile(fileName);
  if (!file) return "";
  return `data:${file.mime};base64,${file.buf.toString("base64")}`;
}
