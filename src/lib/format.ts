export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const SHOP_TZ = "Asia/Shanghai";

/** 店内日期一律按上海时区，避免服务器 UTC 和手机本地不一致导致页面对不上。 */
export function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDateTime(d: Date) {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHOP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${formatDate(d)} ${time}`;
}

export function formatDateTimeLocal(d: Date) {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: SHOP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${formatDate(d)}T${time}`;
}
