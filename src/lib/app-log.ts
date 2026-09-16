import { prisma } from "@/lib/prisma";

export async function writeAppLog(input: {
  action: string;
  detail?: string;
  module?: string;
  level?: "info" | "warn" | "error";
  username?: string;
}) {
  try {
    await prisma.appLog.create({
      data: {
        action: input.action,
        detail: (input.detail ?? "").slice(0, 2000),
        module: input.module ?? "",
        level: input.level ?? "info",
        username: input.username ?? "",
      },
    });
  } catch {
    /* 表尚未推送时不挡业务 */
  }
}
