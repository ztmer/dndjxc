import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@resvg/resvg-js",
    "@resvg/resvg-js-win32-x64-msvc",
    "@resvg/resvg-js-linux-x64-gnu",
  ],
  // 手机用局域网 IP 打开时，必须放行，否则 /_next 脚本被拦，按钮全无反应
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
