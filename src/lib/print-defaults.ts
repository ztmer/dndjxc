/** 内置打印版式。占位符 {{shop}} {{docNo}} 等，打印页注入数据。 */

const TBL = "border-collapse:collapse;width:100%;font-size:12px;";
const TD = "border:1px solid #222;padding:3px 6px;";
const TH = `${TD}background:#f3f3f3;text-align:center;`;

export const DEFAULT_TEMPLATES: { bizType: string; name: string; html: string }[] = [
  {
    bizType: "salesOrder",
    name: "销售小票默认",
    html: `<h1 style="text-align:center;font-size:18px;margin:0 0 8px">{{shop}}</h1><h2 style="text-align:center;font-size:14px;margin:0 0 8px">销售单 {{docNo}}</h2><p>客户：{{customer}}　结算：{{settlement}}　{{watermark}}</p><table style="${TBL}"><tr><th style="${TH}">商品</th><th style="${TH}">数量</th><th style="${TH}">单价</th><th style="${TH}">金额</th></tr>{{lines}}</table><p>合计：{{total}}</p>`,
  },
  {
    bizType: "deliveryNote",
    name: "送货单（210×140 二等份）",
    html: `<style>
@page{size:210mm 140mm;margin:8mm}
@media print{.no-print{display:none!important}body{margin:0}}
.dn{width:194mm;height:124mm;box-sizing:border-box;padding:6px 8px;border:1px solid #111;display:flex;flex-direction:column;font-size:12px;color:#111}
.dn h1{margin:0;font-size:16px;text-align:center}
.dn h2{margin:2px 0 6px;font-size:13px;text-align:center;letter-spacing:4px}
.dn .meta{display:flex;justify-content:space-between;gap:8px;margin-bottom:4px}
.dn table{border-collapse:collapse;width:100%;flex:1}
.dn td,.dn th{border:1px solid #333;padding:2px 4px}
.dn th{background:#f2f2f2}
.dn .sign{display:flex;justify-content:space-between;margin-top:6px}
</style>
<p class="no-print" style="font-size:12px;color:#666">纸张请选 <b>210×140mm 二等份多层纸</b>。只打一页，下面几层靠复写。</p>
<div class="dn">
  <h1>{{shop}}</h1>
  <h2>送 货 单</h2>
  <div class="meta"><span>单号：{{docNo}}</span><span>日期：{{date}}</span><span>{{watermark}}</span></div>
  <div class="meta"><span>收货单位：{{customer}}</span><span>电话：{{phone}}</span></div>
  <div class="meta"><span>送货地址：{{address}}</span><span>结算：{{settlement}}</span></div>
  <table>
    <tr><th>品名规格</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th><th>串号</th></tr>
    {{deliveryLines}}
  </table>
  <div class="meta"><span>合计（大写）：{{totalCn}}</span><span>¥{{total}}</span><span>{{taxInvoice}}</span></div>
  <p style="margin:4px 0">备注：{{remark}}</p>
  <div class="sign"><span>送货人：________</span><span>收货人签收：________</span><span>日期：________</span></div>
</div>`,
  },
  {
    bizType: "statement",
    name: "对账单（A4）",
    html: `<style>
@page{size:A4;margin:16mm}
@media print{.no-print{display:none!important}}
.st{font-size:13px;color:#111;line-height:1.55}
.st h1{text-align:center;font-size:20px;margin:0}
.st h2{text-align:center;font-size:16px;margin:6px 0 12px;letter-spacing:6px}
.st table{border-collapse:collapse;width:100%;margin:10px 0}
.st td,.st th{border:1px solid #333;padding:5px 8px}
.st th{background:#f4f4f4}
.st .sign{display:flex;justify-content:space-between;margin-top:36px}
</style>
<p class="no-print" style="font-size:12px;color:#666">纸张请选 <b>A4</b>。</p>
<div class="st">
  <h1>{{shop}}</h1>
  <h2>往来对账单</h2>
  <p>甲方（客户）：<b>{{customer}}</b>　联系人：{{contact}}　电话：{{phone}}</p>
  <p>乙方（供货/服务方）：<b>{{shop}}</b>　地址：{{shopAddress}}　电话：{{shopPhone}}</p>
  <p>对账期间：<b>{{period}}</b>　对账单号：{{docNo}}　结算周期：{{settlement}}</p>
  <p>现将本期间已发生、尚未在本单外结清的往来列示如下，请核对。如有异议请于五个工作日内书面提出，逾期视为确认。</p>
  <table>
    <tr><th>日期</th><th>来源单号</th><th>内容</th><th>材料</th><th>服务</th><th>合计</th><th>已收</th><th>未收</th></tr>
    {{lines}}
    <tr><td colspan="3" style="text-align:right">本单合计</td><td style="text-align:right">{{material}}</td><td style="text-align:right">{{service}}</td><td style="text-align:right">{{total}}</td><td style="text-align:right">{{received}}</td><td style="text-align:right">{{open}}</td></tr>
  </table>
  <p>应付余额（大写）：{{openCn}}　（小写 ¥{{open}}）</p>
  <p>收款方式：现金 / 微信 / 支付宝 / 对公转账，以实际收款单为准。月结、年结客户请按约定周期付款。</p>
  <div class="sign">
    <div>甲方确认（盖章）：<br/><br/>日期：　　年　　月　　日</div>
    <div>乙方（盖章）：{{shop}}<br/><br/>日期：{{printDate}}</div>
  </div>
</div>`,
  },
  {
    bizType: "contract",
    name: "工程承包合同（A4）",
    html: `<style>
@page{size:A4;margin:18mm 16mm}
@media print{.no-print{display:none!important}}
.ct{font-size:13px;color:#111;line-height:1.7}
.ct h1{text-align:center;font-size:20px;margin:0 0 4px}
.ct .sub{text-align:center;color:#444;margin:0 0 16px}
.ct h3{font-size:14px;margin:14px 0 6px}
.ct table{border-collapse:collapse;width:100%;margin:6px 0}
.ct td,.ct th{border:1px solid #333;padding:5px 8px}
.ct .sign{display:flex;justify-content:space-between;gap:24px;margin-top:28px}
.ct .box{width:46%}
</style>
<p class="no-print" style="font-size:12px;color:#666">纸张请选 <b>A4</b>。正式合同，双面打印后双方盖章各执一份。</p>
<div class="ct">
  <h1>{{title}}</h1>
  <p class="sub">合同编号：{{docNo}}　签订日期：{{signDate}}</p>
  <p><b>甲方（发包人）</b>：{{customer}}<br/>
  联系人：{{contact}}　电话：{{phone}}<br/>
  地址：{{address}}<br/>
  开票资料：{{invoiceInfo}}</p>
  <p><b>乙方（承包人）</b>：{{shop}}<br/>
  地址：{{shopAddress}}　电话：{{shopPhone}}</p>
  <p>根据《中华人民共和国民法典》及相关规定，甲乙双方本着平等、自愿、诚信原则，就「{{title}}」工程事宜订立本合同。</p>

  <h3>第一条　工程内容与标的</h3>
  <p>1.1 工程名称：{{title}}。<br/>
  1.2 工期：{{duration}}。<br/>
  1.3 工作内容以双方确认的点位、图纸或现场交底为准。本合同备注：{{remark}}</p>

  <h3>第二条　合同价款与发票</h3>
  <p>2.1 合同总价为人民币（大写）<b>{{amountCn}}</b>（小写 ¥{{amount}}），{{taxText}}。<br/>
  2.2 开票约定：{{invoiceText}}。<br/>
  2.3 合同价款已包含本合同约定范围内的材料、施工及质保。合同外增项须书面确认后另行计费；工程工单用料默认不再向甲方重复计收合同价款。</p>

  <h3>第三条　付款方式</h3>
  <p>3.1 结算周期：{{settlement}}。<br/>
  3.2 计划收款：</p>
  <table>
    <tr><th>款项</th><th>金额（元）</th><th>预计日期</th></tr>
    {{schedules}}
  </table>
  <p>3.3 甲方应按约定支付。现金、微信、支付宝、转账均以乙方收款单为准。</p>

  <h3>第四条　双方责任</h3>
  <p><b>甲方责任：</b>按约定付款；提供施工所需现场条件、电源、进场许可；及时验收；对现场原有设施、管线予以说明。<br/>
  <b>乙方责任：</b>按约定施工、使用合格材料；遵守现场安全规定；对施工质量负责；保守甲方商业秘密；完工后清理现场。</p>

  <h3>第五条　验收与质保</h3>
  <p>5.1 工程完工后双方验收。验收合格日为质保起算日。<br/>
  5.2 质保期为验收合格之日起 <b>{{warrantyMonths}}</b> 个月。质保期内因乙方施工或所供材料导致的故障，乙方免费维修（人为损坏、自然灾害、甲方擅自改动除外）。<br/>
  5.3 质保期内上门按保内处理；到期后另行计费。</p>

  <h3>第六条　违约与争议</h3>
  <p>6.1 甲方逾期付款的，乙方可暂停施工且不承担延误责任。<br/>
  6.2 乙方逾期完工且非甲方原因的，双方可协商赔偿或顺延。<br/>
  6.3 争议先协商；协商不成向乙方所在地人民法院起诉。</p>

  <h3>第七条　其它</h3>
  <p>7.1 本合同一式贰份，甲乙双方各执壹份，自双方签字盖章之日起生效。<br/>
  7.2 未尽事宜可签补充协议，与本合同具有同等效力。</p>

  <div class="sign">
    <div class="box">
      <p><b>甲方（盖章）</b></p>
      <p>授权代表：____________</p>
      <p>日期：　　年　　月　　日</p>
    </div>
    <div class="box">
      <p><b>乙方（盖章）</b>　{{shop}}</p>
      <p>授权代表：____________</p>
      <p>日期：{{signDate}}</p>
    </div>
  </div>
</div>`,
  },
  {
    bizType: "buildConfig",
    name: "配置清单客户联",
    html: `<h1 style="text-align:center">{{shop}}</h1><h2 style="text-align:center">组装配置单 {{docNo}}</h2><p>客户：{{customer}}　机型：{{modelName}}</p><table style="${TBL}"><tr><th style="${TH}">配件</th><th style="${TH}">数量</th><th style="${TH}">单价</th><th style="${TH}">金额</th></tr>{{lines}}</table><p>工时：{{labor}}　合计：{{total}}</p><p>（客户联不含进价）</p>`,
  },
  {
    bizType: "installSheet",
    name: "装机单（无单价）",
    html: `<h1 style="text-align:center">{{shop}}</h1><h2 style="text-align:center">装机单 {{docNo}}</h2><p>客户：{{customer}}　机型：{{modelName}}　整机 SN：{{unitSn}}</p><table style="${TBL}"><tr><th style="${TH}">槽位</th><th style="${TH}">配件</th><th style="${TH}">数量</th><th style="${TH}">串号</th></tr>{{lines}}</table><p>本单供装机核对，不列单价与金额</p>`,
  },
  {
    bizType: "workOrder",
    name: "工单默认",
    html: `<h1>{{shop}}</h1><h2>工单 {{docNo}}</h2><p>客户：{{customer}}　{{watermark}}</p><p>过程：{{process}}</p><table style="${TBL}">{{lines}}</table>`,
  },
  {
    bizType: "purchaseReceipt",
    name: "采购入库默认",
    html: `<h1>{{shop}}</h1><h2>采购入库 {{docNo}}</h2><p>供应商：{{supplier}}　{{watermark}}</p><table style="${TBL}"><tr><th style="${TH}">商品</th><th style="${TH}">数量</th><th style="${TH}">进价</th><th style="${TH}">唯一 SN</th></tr>{{lines}}</table>`,
  },
  {
    bizType: "receipt",
    name: "收款单默认",
    html: `<h1 style="text-align:center">{{shop}}</h1><h2 style="text-align:center">收款单 {{docNo}}</h2><p>客户：{{customer}}　方式：{{method}}　金额：{{amount}}　{{watermark}}</p>`,
  },
  {
    bizType: "warrantyLabel",
    name: "保修箱贴 70×50",
    html: `<div style="width:70mm;height:50mm;box-sizing:border-box;padding:2mm;font-size:11px"><h1 style="margin:0;text-align:center;font-size:14px">{{shop}}</h1><h2 style="margin:2px 0;text-align:center;font-size:12px">保修</h2><p>品名：{{name}}</p><p>SN：{{serial}}</p><p>保修至：{{warranty}}</p><p>电话：{{phone}}</p></div>`,
  },
];
