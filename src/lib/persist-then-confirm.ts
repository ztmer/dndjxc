export type DocSaveResult = { ok: true; id: string } | { ok: false; error: string };

/** 店里流程：可先暂存；点确认则保存后立即生效（扣库存/入账），不再单独点审核。 */
export async function persistThenConfirm(
  save: () => Promise<DocSaveResult>,
  submit: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>,
  confirm: boolean,
): Promise<DocSaveResult> {
  const r = await save();
  if (!r.ok) return r;
  if (!confirm) return r;
  const s = await submit(r.id);
  if (!s.ok) return { ok: false, error: s.error };
  return r;
}
