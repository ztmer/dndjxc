import { prisma } from "../src/lib/prisma.ts";
import { signSession } from "../src/lib/auth-crypto.ts";

const BASE = process.env.GATE_C_BASE || "http://127.0.0.1:3010";

async function htmlFor(username, path) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error(`no user ${username}`);
  const cookie = `shop-session=${signSession(user.id)}; shop-device=desktop`;
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "follow" });
  const body = await res.text();
  return { status: res.status, url: res.url, hasCostLabel: body.includes(">进价<") || body.includes("进价</"), hasRefCost: body.includes("参考进价") };
}

async function main() {
  const product = await prisma.product.findFirst({ where: { enabled: true }, select: { id: true } });
  if (!product) throw new Error("no product");
  const path = `/products/${product.id}`;
  const clerk = await htmlFor("clerk", path);
  const owner = await htmlFor("owner", path);
  console.log(`clerk status=${clerk.status} costLabel=${clerk.hasCostLabel} urlHasLogin=${clerk.url.includes("/login")}`);
  console.log(`owner status=${owner.status} costLabel=${owner.hasCostLabel}`);
  const clerkOk = clerk.status === 200 && !clerk.url.includes("/login") && !clerk.hasCostLabel;
  const ownerOk = owner.status === 200 && owner.hasCostLabel;
  if (!clerkOk || !ownerOk) {
    console.error("GATE_C_COST_FAIL");
    process.exit(1);
  }
  console.log("GATE_C_COST_OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
