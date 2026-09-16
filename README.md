# 电脑店系统

Next.js + Prisma（SQLite）+ shadcn/ui。业务规则见上级目录 `电脑店系统规划.md` 与 Skill `diannaodian`。

```bash
npm install
npm run db:setup
npm run dev
```

本机开发：浏览器打开 http://localhost:3010 （避免占用其它项目的 3000 端口）

店内已部署：优先 **https://192.168.10.104**（自签证书，第一次选继续访问）。旧地址 http://192.168.10.104:3010 仍可用。手机同一局域网。店员说明见 [手机端使用说明.md](./手机端使用说明.md)。部署细节见 [DEPLOY_ARCH.md](./DEPLOY_ARCH.md)。

演示数据：散客、月结客户「星辰网络」；内存/硬盘有期初库存（硬盘串号 SN-HDD-001 起）。
