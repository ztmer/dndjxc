export const WECOM_DOC_OPTIONS = [
  { value: "salesOrder", label: "销售单" },
  { value: "workOrder", label: "工单" },
  { value: "deliveryNote", label: "送货单" },
  { value: "contract", label: "合同" },
  { value: "installSheet", label: "装机单" },
] as const;

export type WecomDocType = (typeof WECOM_DOC_OPTIONS)[number]["value"];

export function parseWecomDocTypes(raw?: string | null): WecomDocType[] {
  const allowed = new Set<string>(WECOM_DOC_OPTIONS.map((x) => x.value));
  try {
    const arr = JSON.parse(raw || "[]") as unknown;
    if (Array.isArray(arr)) {
      const picked = arr.filter((x): x is WecomDocType => typeof x === "string" && allowed.has(x));
      if (picked.length) return picked;
    }
  } catch {
    /* 旧数据 */
  }
  return ["workOrder"];
}

export function wecomDocLabel(t: WecomDocType) {
  return WECOM_DOC_OPTIONS.find((x) => x.value === t)?.label ?? t;
}
