/** 两套界面：办公台（现有侧栏+页签）与柜台台（顶栏快捷、更密、不叠页签）。 */

export const UI_SCHEME_KEY = "shop-ui-scheme";

export type UiScheme = "office" | "counter";

export const UI_SCHEMES: { id: UiScheme; name: string; hint: string }[] = [
  { id: "office", name: "办公台", hint: "左侧菜单 + 多页签。坐着对账、改合同、查流水用。" },
  { id: "counter", name: "柜台台", hint: "顶栏大按钮、字更密、不叠页签。站柜台成交、开工单用。" },
];

export function parseUiScheme(raw: string | null | undefined): UiScheme {
  return raw === "counter" ? "counter" : "office";
}
