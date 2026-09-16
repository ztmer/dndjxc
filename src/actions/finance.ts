"use server";

import { assertLoggedIn } from "@/lib/require-session";

import { prisma } from "@/lib/prisma";
import { d } from "@/lib/money";
import { nextDocNo } from "@/lib/numbering";
import { addTimeline } from "@/lib/timeline";
import { assertDraft, assertSubmitted, REOPEN_DRAFT } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { resolveStatementPeriod, type StatementPeriodKind } from "@/lib/periods";

export async function generateStatement(input: {
  customerId: string;
  periodKind: StatementPeriodKind;
  customStart?: string;
  customEnd?: string;
}) {
  await assertLoggedIn();

  try {
    if (!input.customerId) throw new Error("请选择客户");
    const { periodStart, periodEnd, periodType } = resolveStatementPeriod(
      input.periodKind,
      input.customStart,
      input.customEnd,
    );
    const settlementWhere =
      periodType === "monthly" || periodType === "yearly"
        ? periodType
        : { in: ["monthly", "yearly"] };
    const id = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
      if (!customer) throw new Error("客户不存在");
      if (customer.isWalkIn) throw new Error("散客不对账");
      const exists = await tx.statement.findFirst({
        where: {
          customerId: input.customerId,
          periodStart,
          periodEnd,
          status: { not: "voided" },
        },
      });
      if (exists) throw new Error("该期间对账单已存在");
      const entries = await tx.arEntry.findMany({
        where: {
          customerId: input.customerId,
          settlement: settlementWhere,
          voided: false,
          statementId: null,
          bizDate: { gte: periodStart, lt: periodEnd },
        },
      });
      if (!entries.length) throw new Error("该期间没有可对账应收");
      const totalAmt = entries.reduce((s, e) => s.add(e.totalAmt), d(0));
      const receivedAmt = entries.reduce((s, e) => s.add(e.receivedAmt), d(0));
      const st = await tx.statement.create({
        data: {
          docNo: await nextDocNo(tx, "ST"),
          customerId: input.customerId,
          periodType,
          periodStart,
          periodEnd,
          totalAmt,
          receivedAmt,
        },
      });
      await tx.arEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) } },
        data: { statementId: st.id },
      });
      return st.id;
    });
    revalidatePath("/statements");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "生成失败" };
  }
}

export async function confirmStatement(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const st = await tx.statement.findUnique({ where: { id } });
      if (!st) throw new Error("对账单不存在");
      assertDraft(st.status);
      await tx.statement.update({
        where: { id },
        data: { status: "confirmed", confirmedAt: new Date() },
      });
      await addTimeline(tx, {
        customerId: st.customerId,
        eventType: "对账单确认",
        refType: "statement",
        refId: st.id,
        refNo: st.docNo,
        summary: `对账单确认 ${st.docNo}`,
        amount: st.totalAmt,
      });
    });
    revalidatePath("/statements");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "确认失败" };
  }
}

export async function postReceipt(input: {
  id?: string;
  customerId: string;
  method: string;
  remark?: string;
  lines: { arEntryId: string; amount: string }[];
}) {
  await assertLoggedIn();

  const saved = await saveReceiptDraft(input);
  if (!saved.ok) return saved;
  const submitted = await submitReceipt(saved.id);
  if (!submitted.ok) return submitted;
  return saved;
}

export async function saveReceiptDraft(input: {
  id?: string;
  customerId: string;
  method: string;
  remark?: string;
  lines: { arEntryId: string; amount: string }[];
}) {
  await assertLoggedIn();

  try {
    const id = await prisma.$transaction(async (tx) => {
      const lineData = input.lines
        .filter((l) => l.arEntryId && d(l.amount).greaterThan(0))
        .map((l) => ({ arEntryId: l.arEntryId, amount: d(l.amount) }));
      if (!lineData.length) throw new Error("请选择核销应收");
      for (const line of lineData) {
        const ar = await tx.arEntry.findUnique({ where: { id: line.arEntryId } });
        if (!ar || ar.voided) throw new Error("应收不存在");
        if (ar.customerId !== input.customerId) throw new Error("不能核销其他客户的应收");
      }
      const amount = lineData.reduce((s, l) => s.add(l.amount), d(0));
      if (input.id) {
        const doc = await tx.receipt.findUnique({ where: { id: input.id } });
        if (!doc) throw new Error("单据不存在");
        assertDraft(doc.status);
        await tx.receiptLine.deleteMany({ where: { headerId: doc.id } });
        await tx.receipt.update({
          where: { id: doc.id },
          data: {
            customerId: input.customerId,
            method: input.method,
            remark: input.remark ?? "",
            amount,
            lines: { create: lineData },
          },
        });
        return doc.id;
      }
      const created = await tx.receipt.create({
        data: {
          docNo: await nextDocNo(tx, "RC"),
          customerId: input.customerId,
          method: input.method,
          remark: input.remark ?? "",
          amount,
          lines: { create: lineData },
        },
      });
      return created.id;
    });
    revalidatePath("/receipts");
    return { ok: true as const, id };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function submitReceipt(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.receipt.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertDraft(doc.status);
      for (const line of doc.lines) {
        const ar = await tx.arEntry.findUnique({ where: { id: line.arEntryId } });
        if (!ar || ar.voided) throw new Error("应收不存在");
        if (ar.customerId !== doc.customerId) throw new Error("不能核销其他客户的应收");
        const next = d(ar.receivedAmt).add(line.amount);
        if (next.greaterThan(ar.totalAmt)) throw new Error(`${ar.sourceNo} 核销超过未收`);
        await tx.arEntry.update({ where: { id: ar.id }, data: { receivedAmt: next } });
        if (ar.statementId) {
          const st = await tx.statement.findUnique({ where: { id: ar.statementId } });
          if (st) {
            await tx.statement.update({
              where: { id: st.id },
              data: { receivedAmt: d(st.receivedAmt).add(line.amount) },
            });
          }
        }
      }
      await addTimeline(tx, {
        customerId: doc.customerId,
        eventType: "收款",
        refType: "receipt",
        refId: doc.id,
        refNo: doc.docNo,
        summary: `收款 ${doc.docNo}`,
        amount: doc.amount,
      });
      await tx.receipt.update({
        where: { id },
        data: { status: "submitted", submittedAt: new Date() },
      });
    });
    revalidatePath("/receipts");
    revalidatePath("/customers");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "收款失败" };
  }
}

export async function voidReceipt(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.receipt.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      for (const line of doc.lines) {
        const ar = await tx.arEntry.findUnique({ where: { id: line.arEntryId } });
        if (ar) {
          await tx.arEntry.update({
            where: { id: ar.id },
            data: { receivedAmt: d(ar.receivedAmt).sub(line.amount) },
          });
          if (ar.statementId) {
            const st = await tx.statement.findUnique({ where: { id: ar.statementId } });
            if (st) {
              await tx.statement.update({
                where: { id: st.id },
                data: { receivedAmt: d(st.receivedAmt).sub(line.amount) },
              });
            }
          }
        }
      }
      await tx.receipt.update({ where: { id }, data: { status: "voided", voidedAt: new Date() } });
    });
    revalidatePath("/receipts");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "作废失败" };
  }
}

export async function unsubmitReceipt(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.receipt.findUnique({ where: { id }, include: { lines: true } });
      if (!doc) throw new Error("单据不存在");
      assertSubmitted(doc.status);
      for (const line of doc.lines) {
        const ar = await tx.arEntry.findUnique({ where: { id: line.arEntryId } });
        if (ar) {
          await tx.arEntry.update({
            where: { id: ar.id },
            data: { receivedAmt: d(ar.receivedAmt).sub(line.amount) },
          });
          if (ar.statementId) {
            const st = await tx.statement.findUnique({ where: { id: ar.statementId } });
            if (st) {
              await tx.statement.update({
                where: { id: st.id },
                data: { receivedAmt: d(st.receivedAmt).sub(line.amount) },
              });
            }
          }
        }
      }
      await tx.receipt.update({ where: { id }, data: REOPEN_DRAFT });
    });
    revalidatePath("/receipts");
    revalidatePath("/customers");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}

export async function unsubmitStatement(id: string) {
  await assertLoggedIn();

  try {
    await prisma.$transaction(async (tx) => {
      const st = await tx.statement.findUnique({ where: { id } });
      if (!st) throw new Error("对账单不存在");
      if (st.status === "voided") throw new Error("已作废不能反审");
      if (st.status !== "confirmed") throw new Error("仅已确认对账单可反审");
      await tx.statement.update({
        where: { id },
        data: { status: "draft", confirmedAt: null },
      });
      await addTimeline(tx, {
        customerId: st.customerId,
        eventType: "对账单反审",
        refType: "statement",
        refId: st.id,
        refNo: st.docNo,
        summary: `对账单反审 ${st.docNo}`,
        amount: 0,
      });
    });
    revalidatePath("/statements");
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "反审失败" };
  }
}
