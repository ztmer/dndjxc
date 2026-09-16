import "dotenv/config";
import { createHash } from "crypto";
import { prisma } from "./prisma";
import { runSafeSystemInit } from "./system-init";

function hash(p: string) {
  return createHash("sha256").update(p).digest("hex");
}

/** 第一次开张：补仓/分类/知识库；没有账号才建店主/店员。不灌演示客户。 */
async function main() {
  const steps = await runSafeSystemInit();
  for (const s of steps) console.log(`${s.name}：${s.detail}`);

  const n = await prisma.user.count();
  if (n === 0) {
    await prisma.user.create({
      data: {
        username: "owner",
        passwordHash: hash("123456"),
        displayName: "店主",
        role: "owner",
        canSeeCost: true,
      },
    });
    await prisma.user.create({
      data: {
        username: "clerk",
        passwordHash: hash("123456"),
        displayName: "店员",
        role: "clerk",
        canSeeCost: false,
      },
    });
    console.log("账号：已建 owner / clerk，初始密码 123456，进店后请改掉");
  } else {
    console.log(`账号：已有 ${n} 个，未改密码`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
