import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";

export const KNOWLEDGE_IMAGE_ID = /^[a-z0-9]{16,32}$/;

export function knowledgeImageDir() {
  return path.join(process.cwd(), "data", "knowledge-images");
}

export function knowledgeImagePath(id: string) {
  if (!KNOWLEDGE_IMAGE_ID.test(id)) throw new Error("图片编号无效");
  return path.join(knowledgeImageDir(), `${id}.jpg`);
}

export function knowledgeImageUrl(id: string) {
  return `/api/knowledge-images/${id}`;
}

export function newKnowledgeImageId() {
  return randomBytes(12).toString("hex");
}

export async function saveKnowledgeJpeg(buf: Buffer) {
  const id = newKnowledgeImageId();
  await fs.mkdir(knowledgeImageDir(), { recursive: true });
  await fs.writeFile(knowledgeImagePath(id), buf);
  return { id, url: knowledgeImageUrl(id) };
}

export async function readKnowledgeJpeg(id: string) {
  try {
    return await fs.readFile(knowledgeImagePath(id));
  } catch {
    return null;
  }
}
