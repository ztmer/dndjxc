export type KbBlock = { type: "text"; text: string } | { type: "image"; src: string; alt: string };

const IMG = /!\[([^\]]*)\]\(([^)]+)\)/g;

/** 知识库配图只允许本店静态图或已登录才能看的上传图。 */
export function isAllowedKbImageSrc(src: string) {
  const s = src.trim();
  if (!s || s.includes("..") || s.includes("\\") || /[\s<>"'`]/.test(s)) return false;
  if (s.startsWith("/knowledge/") && /^\/knowledge\/[a-zA-Z0-9._-]+\.(svg|png|jpg|jpeg|webp)$/.test(s)) return true;
  if (s.startsWith("/product-images/") && /^\/product-images\/[a-zA-Z0-9._-]+\.(svg|png|jpg|jpeg|webp)$/.test(s)) return true;
  if (/^\/api\/knowledge-images\/[a-z0-9]{16,32}$/.test(s)) return true;
  if (/^\/api\/product-images\/[a-z0-9]{16,32}$/.test(s)) return true;
  return false;
}

export function parseKbRichText(raw: string): KbBlock[] {
  const text = raw ?? "";
  const blocks: KbBlock[] = [];
  let last = 0;
  IMG.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = IMG.exec(text))) {
    if (m.index > last) blocks.push({ type: "text", text: text.slice(last, m.index) });
    const src = m[2].trim();
    if (isAllowedKbImageSrc(src)) blocks.push({ type: "image", src, alt: m[1] || "" });
    else blocks.push({ type: "text", text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) blocks.push({ type: "text", text: text.slice(last) });
  if (blocks.length === 0) blocks.push({ type: "text", text });
  return blocks;
}

export function markdownImage(src: string, alt = "示意图") {
  return `\n\n![${alt}](${src})\n\n`;
}
