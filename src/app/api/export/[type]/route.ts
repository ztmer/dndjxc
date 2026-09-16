import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function workbook(name: string, headers: string[], rows: (string | number)[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(name);
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r);
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=${encodeURIComponent(name)}.xlsx`,
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (type === "sales") {
    const rows = await prisma.salesOrderLine.findMany({ include: { header: { include: { customer: true } } } });
    const products = await prisma.product.findMany();
    const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
    return workbook(
      "销售明细",
      ["单号", "客户", "商品", "单位", "数量", "单价", "金额", "状态"],
      rows.map((r) => [r.header.docNo, r.header.customer.name, pmap[r.productId]?.name ?? "", pmap[r.productId]?.unit ?? "", Number(r.qty), Number(r.price), Number(r.amount), r.header.status]),
    );
  }
  if (type === "work-orders") {
    const rows = await prisma.workOrderLine.findMany({ include: { header: { include: { customer: true } } } });
    const products = await prisma.product.findMany();
    const pmap = Object.fromEntries(products.map((p) => [p.id, p]));
    return workbook(
      "工单明细",
      ["单号", "客户", "项目", "单位", "数量", "金额", "增项", "状态"],
      rows.map((r) => [r.header.docNo, r.header.customer.name, pmap[r.productId]?.name ?? "", pmap[r.productId]?.unit ?? "", Number(r.qty), Number(r.amount), r.isContractExtra ? "是" : "", r.header.status]),
    );
  }
  if (type === "stock") {
    const rows = await prisma.stockBalance.findMany({ include: { product: true, warehouse: true } });
    return workbook(
      "库存明细",
      ["仓库", "编码", "商品", "结存"],
      rows.map((r) => [r.warehouse.name, r.product.code, r.product.name, Number(r.qty)]),
    );
  }
  if (type === "ledgers") {
    const rows = await prisma.stockLedger.findMany({ include: { product: true }, take: 2000, orderBy: { createdAt: "desc" } });
    return workbook(
      "库存流水",
      ["时间", "单号", "商品", "变动", "结存"],
      rows.map((r) => [r.createdAt.toISOString(), r.refNo, r.product.name, Number(r.qty), Number(r.balanceAfter)]),
    );
  }
  if (type === "labors") {
    const rows = await prisma.dayLabor.findMany({ include: { workOrder: { include: { customer: true } } } });
    return workbook(
      "临时工成本",
      ["日期", "姓名", "天数", "日薪", "金额", "工单", "客户"],
      rows.map((r) => [r.workDate.toISOString().slice(0, 10), r.name, Number(r.days), Number(r.dayRate), Number(r.amount), r.workOrder.docNo, r.workOrder.customer.name]),
    );
  }
  if (type === "catalog") {
    const { catalogTemplateBuffer } = await import("@/lib/catalog-xlsx");
    const buf = await catalogTemplateBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${encodeURIComponent("产品目录导入模板")}.xlsx`,
      },
    });
  }
  return NextResponse.json({ error: "未知导出" }, { status: 400 });
}
