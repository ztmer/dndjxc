# 电脑店系统 · 部署架构

版本：v1.2  
状态：已部署（局域网生产）

本文件不记录任何账号密码。SSH 与登录凭据由店主自行保管。

## 架构图

```
局域网手机 / 店内电脑
        │  https://192.168.10.104   （80 跳转到 443）
        │  http://192.168.10.104:3010  仍可用（旧书签）
        ▼
Ubuntu 主机 192.168.10.104
  nginx :80 / :443  （自签证书 SAN=IP:192.168.10.104）
        │ 反代 127.0.0.1:3010
        ▼
  systemd: diannaodian.service  (User=ztmer)
  Next.js 16 production  `next start --hostname 0.0.0.0 --port 3010`
  SQLite: /home/ztmer/apps/diannaodian/prisma/dev.db
```

外部依赖：无公网域名。HTTPS 为店内自签证书（Let’s Encrypt 不能签私网 IP）。手机拍照/实时扫码请走 https。首次打开证书警告选「高级 → 继续访问」。

## 主机与路径

| 项 | 值 |
|---|---|
| 主机 | 192.168.10.104 |
| 系统 | Ubuntu 24.04 |
| 运行用户 | ztmer |
| 代码目录 | `/home/ztmer/apps/diannaodian` |
| 环境文件 | `/home/ztmer/apps/diannaodian/.env` |
| 数据库 | SQLite `file:./prisma/dev.db` |
| 端口 | 3010（应用，`0.0.0.0`）；80/443（nginx） |
| 进程管理 | systemd 单元 `/etc/systemd/system/diannaodian.service`；nginx `diannaodian` 站点 |
| TLS | `/etc/ssl/diannaodian/cert.pem` + `key.pem`（自签，十年） |
| 开机自启 | `systemctl enable diannaodian` |

`.env` 含 `DATABASE_URL`、`AUTH_SECRET`、`NODE_ENV=production`。不要把 `.env` 提交进 git。

## 访问

- 推荐（拍照、实时扫码）：**https://192.168.10.104**
- 旧地址仍可用：http://192.168.10.104:3010
- 无公网域名，证书浏览器会提示不受信任，店内点继续即可
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

日常更新：改完功能后同步源码（**不覆盖** `.env` 与 `prisma/dev.db`）→ `npm install` → `npx prisma db push`（不丢数据）→ `next build --webpack` → `sudo systemctl restart diannaodian`。不要对生产库执行会清空数据的命令。

## 变更记录

### v1.2 — 2026-09-14 — 局域网 HTTPS

**修改内容**：nginx 443 自签证书（SAN=IP），80 跳 https；应用仍 3010。开通脚本 `scripts/_lan_enable_https.py`。
**备份路径**：`history/DEPLOY_ARCH_v1.1_20260914.md`

### v1.1 — 2026-09-14 — 日常同步 + 开工单客户筛选

**修改内容**：约定改完即同步到 192.168.10.104；开工单客户改为可输入筛选。不覆盖服务器 `.env` 与数据库。
**备份路径**：`history/DEPLOY_ARCH_v1.0_20260914.md`

### v1.0 — 2026-09-14 — 首次部署到 192.168.10.104

**修改内容**：应用目录、systemd、3010 端口、webpack 生产构建、局域网 http 访问。
