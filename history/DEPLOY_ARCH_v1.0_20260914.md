# 电脑店系统 · 部署架构

版本：v1.0  
状态：已部署（局域网生产）

本文件不记录任何账号密码。SSH 与登录凭据由店主自行保管。

## 架构图

```
局域网手机 / 店内电脑
        │  http://192.168.10.104:3010
        ▼
Ubuntu 主机 192.168.10.104
  systemd: diannaodian.service  (User=ztmer)
  Next.js 16 production  `next start --hostname 0.0.0.0 --port 3010`
  SQLite: /home/ztmer/apps/diannaodian/prisma/dev.db
```

外部依赖：无公网域名、无反向代理、无 HTTPS（店内必须用 http，手机扫码才能走「拍照识码」）。

## 主机与路径

| 项 | 值 |
|---|---|
| 主机 | 192.168.10.104 |
| 系统 | Ubuntu 24.04 |
| 运行用户 | ztmer |
| 代码目录 | `/home/ztmer/apps/diannaodian` |
| 环境文件 | `/home/ztmer/apps/diannaodian/.env` |
| 数据库 | SQLite `file:./prisma/dev.db` |
| 端口 | 3010（监听 `0.0.0.0`） |
| 进程管理 | systemd 单元 `/etc/systemd/system/diannaodian.service` |
| 开机自启 | `systemctl enable diannaodian` |

`.env` 含 `DATABASE_URL`、`AUTH_SECRET`、`NODE_ENV=production`。不要把 `.env` 提交进 git。

## 访问

- 店内电脑 / 手机（同一局域网）：**http://192.168.10.104:3010**
- 必须 http，不要写成 https
- 业务登录账号见店内约定（演示种子为 `owner` / `clerk`）

## 生产构建注意（Next.js 16.3）

默认 `next build` 走 Turbopack，产物里没有 `BUILD_ID` 和 `routes-manifest.json`，`next start` 会立刻退出。

本机与服务器一律使用：

```bash
npx next build --webpack
```

`package.json` 的 `build` 脚本已写成 `prisma generate && next build --webpack`。

## 常用运维

```bash
sudo systemctl status diannaodian
sudo systemctl restart diannaodian
sudo journalctl -u diannaodian -n 80 --no-pager
```

备份数据库：复制 `prisma/dev.db`（先停服务或至少保证没有正在写入的长事务）。

更新代码：同步源码 → `npm install` → `npx prisma db push`（不丢数据）→ `npm run build` → `sudo systemctl restart diannaodian`。不要对生产库执行会清空数据的命令。

## 变更记录

### v1.0 — 2026-09-14 — 首次部署到 192.168.10.104

**修改内容**：应用目录、systemd、3010 端口、webpack 生产构建、局域网 http 访问。
