/** 人民币大写，用于合同价款。 */
export function amountInChinese(v: string | number) {
  const n = Math.round(Number(v) * 100);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n === 0) return "零元整";
  const cn = ["零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖"];
  const units = ["", "拾", "佰", "仟"];
  const big = ["", "万", "亿"];
  const yuan = Math.floor(n / 100);
  const jiao = Math.floor((n % 100) / 10);
  const fen = n % 10;
  function chunk(num: number) {
    let s = "";
    let zero = false;
    const str = String(num).padStart(4, "0");
    for (let i = 0; i < 4; i++) {
      const d = Number(str[i]);
      const u = units[3 - i];
      if (d === 0) {
        zero = true;
        continue;
      }
      if (zero && s) s += "零";
      zero = false;
      s += cn[d] + u;
    }
    return s;
  }
  let yuanStr = "";
  let rest = yuan;
  let bi = 0;
  while (rest > 0 && bi < 3) {
    const part = rest % 10000;
    if (part) yuanStr = chunk(part) + big[bi] + yuanStr;
    else if (yuanStr) yuanStr = "零" + yuanStr;
    rest = Math.floor(rest / 10000);
    bi++;
  }
  yuanStr = yuanStr.replace(/零+/g, "零").replace(/零+$/g, "");
  let out = (yuanStr || "零") + "元";
  if (!jiao && !fen) out += "整";
  else {
    if (jiao) out += cn[jiao] + "角";
    else if (fen) out += "零";
    if (fen) out += cn[fen] + "分";
  }
  return out;
}

export function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
