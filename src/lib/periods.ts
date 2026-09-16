/** 月结：上月 1 日 00:00 至本月 1 日 00:00 之前 */
export function monthlyPeriod(now = new Date()) {
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { periodStart, periodEnd };
}

export function currentMonthPeriod(now = new Date()) {
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { periodStart, periodEnd };
}

/** 年结：去年自然年 */
export function yearlyPeriod(now = new Date()) {
  const periodStart = new Date(now.getFullYear() - 1, 0, 1);
  const periodEnd = new Date(now.getFullYear(), 0, 1);
  return { periodStart, periodEnd };
}

export function currentYearPeriod(now = new Date()) {
  const periodStart = new Date(now.getFullYear(), 0, 1);
  const periodEnd = new Date(now.getFullYear() + 1, 0, 1);
  return { periodStart, periodEnd };
}

/** 周一 00:00（本地） */
export function startOfWeekMonday(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function currentWeekPeriod(now = new Date()) {
  const periodStart = startOfWeekMonday(now);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + 7);
  return { periodStart, periodEnd };
}

export function lastWeekPeriod(now = new Date()) {
  const cur = currentWeekPeriod(now);
  const periodStart = new Date(cur.periodStart);
  periodStart.setDate(periodStart.getDate() - 7);
  return { periodStart, periodEnd: cur.periodStart };
}

/** 自定义：起止日期均为含当天，返回 [start, endExclusive) */
export function customPeriod(startYmd: string, endYmd: string) {
  const start = parseYmd(startYmd);
  const endDay = parseYmd(endYmd);
  if (!start || !endDay) throw new Error("请选择起止日期");
  if (endDay.getTime() < start.getTime()) throw new Error("结束日期不能早于开始日期");
  const periodEnd = new Date(endDay);
  periodEnd.setDate(periodEnd.getDate() + 1);
  return { periodStart: start, periodEnd };
}

function parseYmd(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

export type StatementPeriodKind = "week" | "lastWeek" | "month" | "lastMonth" | "year" | "lastYear" | "custom";

export function resolveStatementPeriod(
  kind: StatementPeriodKind,
  customStart?: string,
  customEnd?: string,
  now = new Date(),
) {
  if (kind === "week") return { ...currentWeekPeriod(now), periodType: "weekly" as const };
  if (kind === "lastWeek") return { ...lastWeekPeriod(now), periodType: "weekly" as const };
  if (kind === "month") return { ...currentMonthPeriod(now), periodType: "monthly" as const };
  if (kind === "lastMonth") return { ...monthlyPeriod(now), periodType: "monthly" as const };
  if (kind === "year") return { ...currentYearPeriod(now), periodType: "yearly" as const };
  if (kind === "lastYear") return { ...yearlyPeriod(now), periodType: "yearly" as const };
  return { ...customPeriod(customStart || "", customEnd || ""), periodType: "custom" as const };
}

export function statementPeriodLabel(periodType: string) {
  if (periodType === "yearly") return "年结";
  if (periodType === "weekly") return "周结";
  if (periodType === "custom") return "指定期间";
  return "月结";
}
