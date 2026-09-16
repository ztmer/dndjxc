/**
 * 一键运行：装依赖、建库、构建、启动。双击根目录「启动.bat」。
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)));
const isWin = process.platform === "win32";

function say(msg) {
  process.stdout.write(msg + "\n");
}

function run(command, args) {
  say(">> " + [command, ...args].join(" "));
  const r = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    env: process.env,
  });
  const code = r.status ?? 1;
  if (code !== 0) {
    say("失败，退出码 " + code);
    process.exit(code);
  }
}

function ensureEnv() {
  const envPath = join(root, ".env");
  if (existsSync(envPath)) {
    say("已有 .env，不覆盖");
    return;
  }
  const secret = randomBytes(32).toString("hex");
  writeFileSync(
    envPath,
    [
      'DATABASE_URL="file:./prisma/dev.db"',
      `AUTH_SECRET="${secret}"`,
      "NODE_ENV=production",
      "",
    ].join("\n"),
    "utf8",
  );
  say("已生成 .env");
}

function openBrowser(url) {
  try {
    if (isWin) spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    else if (process.platform === "darwin") spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    else spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* 浏览器打不开也不挡启动 */
  }
}

ensureEnv();
mkdirSync(join(root, "data"), { recursive: true });
say("安装依赖（第一次较慢）…");
run("npm", ["install"]);
say("准备数据库…");
run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "db", "push"]);
run("npx", ["tsx", "src/lib/first-run-bootstrap.ts"]);
if (!existsSync(join(root, ".next", "BUILD_ID"))) {
  say("生产构建（第一次几分钟）…");
  run("npx", ["next", "build", "--webpack"]);
} else {
  say("已有构建，跳过 next build");
}

const url = "http://127.0.0.1:3010/login";
say("正在启动，浏览器将打开 " + url);
setTimeout(() => openBrowser(url), 3000);
const child = spawn("npx", ["next", "start", "--hostname", "0.0.0.0", "--port", "3010"], {
  cwd: root,
  stdio: "inherit",
  shell: isWin,
  env: { ...process.env, NODE_ENV: "production" },
});
child.on("exit", (code) => process.exit(code ?? 0));
