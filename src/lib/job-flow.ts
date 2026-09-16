/** 监控/弱电工程主线：谈单 → 下单 → 施工 → 验收 → 结款 → 售后。含税带票是合同属性，可随时收款。 */

export type JobStepState = "done" | "current" | "todo";

export type JobStep = {
  key: string;
  label: string;
  hint: string;
  state: JobStepState;
};

export function buildJobFlow(input: {
  contractStatus: string;
  hasProject: boolean;
  progress: string;
  accepted: boolean;
  arTotal: number;
  arOpen: number;
  /** 验收后是否已开过售后工单；没有就不能把「售后」标成已完成 */
  hasAfterSales?: boolean;
}): JobStep[] {
  const ordered = contractSubmitted(input.contractStatus);
  const building = input.hasProject && (input.progress === "in_progress" || input.accepted);
  const accepted = input.accepted;
  const paid = ordered && input.arTotal > 0 && input.arOpen <= 0.009;
  const after = !!input.hasAfterSales;

  const raw: { key: string; label: string; hint: string; done: boolean }[] = [
    { key: "talk", label: "谈单", hint: "草稿：项目、金额、含税带票、收款计划", done: true },
    { key: "order", label: "下单", hint: "点下单，合同额进客户应收", done: ordered },
    { key: "build", label: "施工", hint: "建工程、开工、多次工单用料（材料默认不再另计应收）", done: building || accepted },
    { key: "accept", label: "验收", hint: "写验收日，质保 = 验收日 + 质保月数", done: accepted },
    { key: "pay", label: "结款", hint: "订金/进度款/尾款随时可收，核销合同应收", done: paid },
    { key: "after", label: "售后", hint: "质保期内开工单，默认保内免费；增项才加钱", done: after },
  ];

  let currentSet = false;
  return raw.map((s) => {
    if (s.done) return { ...s, state: "done" as const };
    if (!currentSet) {
      currentSet = true;
      return { ...s, state: "current" as const };
    }
    return { ...s, state: "todo" as const };
  });
}

export function contractSubmitted(status: string) {
  return status === "submitted";
}

export function invoiceLabel(needInvoice: boolean, invoiceType: string) {
  if (!needInvoice) return "不带票";
  if (invoiceType === "special") return "带专票";
  if (invoiceType === "plain") return "带普票";
  return "要开票";
}

function markSteps(raw: { key: string; label: string; hint: string; done: boolean }[]): JobStep[] {
  let currentSet = false;
  return raw.map((s) => {
    if (s.done) return { ...s, state: "done" as const };
    if (!currentSet) {
      currentSet = true;
      return { ...s, state: "current" as const };
    }
    return { ...s, state: "todo" as const };
  });
}

/** 销售：散客现货收款；其它客户谈单→开单→缺货采购→送货→结款→售后 */
export function buildSalesFlow(input: {
  isWalkIn: boolean;
  status: string;
  hasOpenPurchase: boolean;
  arTotal: number;
  arOpen: number;
}): JobStep[] {
  const submitted = input.status === "submitted";
  const paid = submitted && input.arTotal > 0 && input.arOpen <= 0.009;
  if (input.isWalkIn) {
    return markSteps([
      { key: "counter", label: "成交", hint: "填明细点成交：出库并当场收款，不用再审一遍", done: submitted },
      { key: "after", label: "售后", hint: "保内开工单或按原单退货", done: false },
    ]);
  }
  return markSteps([
    { key: "talk", label: "报价", hint: "先暂存报价；谈妥再开单", done: true },
    { key: "order", label: "开单", hint: "点开单出库。缺货会出待采购，有货才扣仓", done: submitted || input.hasOpenPurchase },
    { key: "buy", label: "采购", hint: "没货先待采购，入库后再来本单开单", done: submitted },
    { key: "ship", label: "送货", hint: "可后补唯一 SN，出库前必须扫齐", done: submitted },
    { key: "pay", label: "结款", hint: "现金当场收；月结/年结进对账单核销", done: paid },
    { key: "after", label: "售后", hint: "保内工单或按本单退货", done: false },
  ]);
}
