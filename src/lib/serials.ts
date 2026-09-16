/** 逗号、空格、换行分隔的唯一 SN。JSON 数组也可。 */
export function parseSerials(json: string | undefined | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json) as unknown;
    if (Array.isArray(v)) return uniq(v.map(String).map((s) => s.trim()).filter(Boolean));
  } catch {
    /* 纯文本 */
  }
  return uniq(json.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean));
}

function uniq(sns: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const sn of sns) {
    if (seen.has(sn)) continue;
    seen.add(sn);
    out.push(sn);
  }
  return out;
}

export function serialsToText(sns: string[]) {
  return sns.join("\n");
}

/** 单据明细展示：JSON 数组或逗号分隔都显示成「顿号」列表。 */
export function formatSerialsDisplay(json: string | undefined | null) {
  const sns = parseSerials(json);
  return sns.length ? sns.join("、") : "—";
}

/** 管唯一 SN：扫码后若数量还是 1，则跟已扫个数走。 */
export function qtyAfterScan(currentQty: string, scanned: number) {
  const n = Number(currentQty);
  if (!currentQty || n <= 1) return String(Math.max(scanned, 1));
  return currentQty;
}

export function serialQtyError(
  products: { id: string; name: string; trackSerial?: boolean }[],
  lines: { productId: string; qty: string; serials?: string }[],
  opts?: { deferSerial?: boolean; optionalSerial?: boolean },
) {
  if (opts?.deferSerial) return null;
  for (const line of lines) {
    if (!line.productId) continue;
    const p = products.find((x) => x.id === line.productId);
    if (!p?.trackSerial) continue;
    const sns = parseSerials(line.serials);
    const n = Number(line.qty);
    if (opts?.optionalSerial) {
      if (sns.length === 0) continue;
      if (sns.length > n) return `${p.name} 已扫 ${sns.length} 个码，不能多于数量 ${n}`;
      continue;
    }
    if (sns.length !== n) {
      return `${p.name} 管唯一 SN：数量 ${n}，已扫 ${sns.length} 个，必须一样多`;
    }
  }
  return null;
}
