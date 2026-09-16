export const LIST_PAGE_SIZE = 20;

export function parseListPage(raw?: string) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function listPageState(pageRaw: string | undefined, total: number) {
  const pageCount = Math.max(1, Math.ceil(Math.max(0, total) / LIST_PAGE_SIZE));
  const page = Math.min(parseListPage(pageRaw), pageCount);
  return {
    page,
    pageCount,
    skip: (page - 1) * LIST_PAGE_SIZE,
    take: LIST_PAGE_SIZE,
  };
}

export function listHref(path: string, query: Record<string, string | number | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === "") continue;
    if ((k === "page" || k === "upage") && Number(v) <= 1) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}
