import ExcelJS from "exceljs";

export const CATALOG_XLSX_HEADERS = [
  "编码",
  "名称",
  "品牌",
  "规格",
  "分类编码",
  "建议售价",
  "建议进价",
  "单位",
  "详细参数",
  "图片网址",
  "备注",
  "保修月",
  "管库存",
  "管串号",
  "可作配件",
] as const;

export type CatalogXlsxRow = {
  code: string;
  name: string;
  brand: string;
  spec: string;
  catCode: string;
  sale: string;
  cost: string;
  unit: string;
  params: string;
  imageUrl: string;
  remark: string;
  warranty: string;
  isStocked: boolean;
  trackSerial: boolean;
  canBeBuildPart: boolean;
};

function cell(v: ExcelJS.CellValue | undefined) {
  if (v == null) return "";
  if (typeof v === "object" && "text" in v) return String(v.text ?? "").trim();
  if (typeof v === "object" && "result" in v) return String((v as { result?: unknown }).result ?? "").trim();
  return String(v).trim();
}

function yn(v: string, fallback: boolean) {
  if (!v) return fallback;
  if (/^(否|0|n|no|false|关)$/i.test(v)) return false;
  if (/^(是|1|y|yes|true|开)$/i.test(v)) return true;
  return fallback;
}

export async function parseCatalogWorkbook(buf: Buffer | ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("空表格");
  const header = (ws.getRow(1).values as ExcelJS.CellValue[]).slice(1).map((x) => cell(x));
  const idx = (name: string) => header.findIndex((h) => h === name);
  const need = ["名称", "分类编码"];
  for (const n of need) {
    if (idx(n) < 0) throw new Error(`表头要有「${n}」。请先下载模板。`);
  }
  const rows: CatalogXlsxRow[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const vals = (row.values as ExcelJS.CellValue[]).slice(1);
    const get = (name: string) => {
      const i = idx(name);
      return i < 0 ? "" : cell(vals[i]);
    };
    const name = get("名称");
    const catCode = get("分类编码");
    if (!name && !get("编码")) return;
    rows.push({
      code: get("编码"),
      name,
      brand: get("品牌"),
      spec: get("规格"),
      catCode,
      sale: get("建议售价") || "0",
      cost: get("建议进价") || "0",
      unit: get("单位") || "件",
      params: get("详细参数"),
      imageUrl: get("图片网址"),
      remark: get("备注"),
      warranty: get("保修月") || "12",
      isStocked: yn(get("管库存"), true),
      trackSerial: yn(get("管串号"), false),
      canBeBuildPart: yn(get("可作配件"), true),
    });
  });
  return rows;
}

export async function catalogTemplateBuffer(sample?: (string | number)[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("产品目录");
  ws.addRow([...CATALOG_XLSX_HEADERS]);
  ws.addRow([
    "CPU-DEMO-1700",
    "酷睿 i5-14400F 散片",
    "英特尔",
    "10核16线程 LGA1700 无核显",
    "PC-CPU",
    899,
    720,
    "个",
    "插槽：LGA1700\n内存：DDR4/DDR5\n形态：散片",
    "",
    "示例行，导入前可删",
    12,
    "是",
    "是",
    "是",
  ]);
  for (const r of sample ?? []) ws.addRow(r);
  const note = wb.addWorksheet("分类编码");
  note.addRow(["分类编码", "说明"]);
  note.addRow(["PC-CPU", "CPU"]);
  note.addRow(["PC-MB", "主板"]);
  note.addRow(["PC-GPU", "显卡"]);
  note.addRow(["PC-RAM", "内存"]);
  note.addRow(["PC-HDD", "硬盘"]);
  note.addRow(["PC-SSD", "固态"]);
  note.addRow(["PC-PSU", "电源"]);
  note.addRow(["PC-CASE", "机箱"]);
  note.addRow(["PC-COOL", "散热器"]);
  note.addRow(["PC-MON", "显示器"]);
  note.addRow(["PC-KM", "键鼠"]);
  note.addRow(["SVC-BUILD", "安装服务"]);
  note.addRow(["管库存/管串号/可作配件", "填 是 或 否"]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
