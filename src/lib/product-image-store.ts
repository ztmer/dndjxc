import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";

export const PRODUCT_IMAGE_ID = /^[a-z0-9]{16,32}$/;

export function productImageDir() {
  return path.join(process.cwd(), "data", "product-images");
}

export function productImagePath(id: string) {
  if (!PRODUCT_IMAGE_ID.test(id)) throw new Error("图片编号无效");
  return path.join(productImageDir(), `${id}.jpg`);
}

export function productImageUrl(id: string) {
  return `/api/product-images/${id}`;
}

export function parseProductImageId(url: string) {
  const m = url.trim().match(/^\/api\/product-images\/([a-z0-9]{16,32})$/);
  return m?.[1] ?? null;
}

export function newProductImageId() {
  return randomBytes(12).toString("hex");
}

export async function saveProductJpeg(buf: Buffer) {
  const id = newProductImageId();
  await fs.mkdir(productImageDir(), { recursive: true });
  await fs.writeFile(productImagePath(id), buf);
  return { id, url: productImageUrl(id) };
}

export async function readProductJpeg(id: string) {
  try {
    return await fs.readFile(productImagePath(id));
  } catch {
    return null;
  }
}

export async function deleteProductJpegByUrl(url: string) {
  const id = parseProductImageId(url);
  if (!id) return;
  try {
    await fs.unlink(productImagePath(id));
  } catch {
    /* 文件可能已不在 */
  }
}
