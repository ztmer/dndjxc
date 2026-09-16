const BASE = process.env.GATE_C_BASE || "http://127.0.0.1:3010";

const paths = ["/", "/customers", "/m", "/m/customers", "/print/workOrder/demo", "/work-orders"];

function leakHits(html, names) {
  const hits = [];
  for (const n of names) {
    if (n && html.includes(n)) hits.push(n);
  }
  if (/WO\d{4,}/.test(html)) hits.push("工单号");
  if (html.includes("待收款") && html.includes("¥")) hits.push("待收款金额块");
  return hits;
}

async function firstHop(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const loc = res.headers.get("location") || "";
  const body = await res.text();
  return { path, status: res.status, loc, body, len: body.length };
}

async function main() {
    const names = [
    "客户档案",
    "新建客户",
    "没有客户",
    "今日上门",
    "待收款",
    "开工单",
  ];
  const report = [];
  for (const p of paths) {
    const r = await firstHop(p);
    const login =
      r.status >= 300 &&
      r.status < 400 &&
      (r.loc.includes("/login") || r.loc.endsWith("/login"));
    const html = r.body;
    const looksLogin = html.includes("进入系统") || html.includes("登录名");
    const leaks = leakHits(html, names);
    const pass = login && leaks.length === 0 && !html.includes("今日上门");
    report.push({ ...r, login, looksLogin, leaks, pass, body: undefined });
    console.log(
      `${pass ? "PASS" : "FAIL"} ${p} status=${r.status} loc=${r.loc} leaks=${leaks.join(",") || "-"} bytes=${r.len}`,
    );
  }

  const loginPage = await fetch(`${BASE}/login`, { redirect: "manual" });
  const loginHtml = await loginPage.text();
  const loginOk =
    loginPage.status === 200 && loginHtml.includes("登录名") && loginHtml.includes("进入系统");
  console.log(`${loginOk ? "PASS" : "FAIL"} /login status=${loginPage.status}`);

  const fake = await fetch(`${BASE}/customers`, {
    redirect: "manual",
    headers: { cookie: "shop-session=not-a-real.session" },
  });
  const fakeLoc = fake.headers.get("location") || "";
  const fakeOk = fake.status >= 300 && fake.status < 400 && fakeLoc.includes("/login");
  console.log(`${fakeOk ? "PASS" : "FAIL"} forged-cookie /customers status=${fake.status} loc=${fakeLoc}`);

  const failed = report.filter((x) => !x.pass).length + (loginOk ? 0 : 1) + (fakeOk ? 0 : 1);
  if (failed) {
    console.error(`GATE_C_FAIL count=${failed}`);
    process.exit(1);
  }
  console.log("GATE_C_OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
