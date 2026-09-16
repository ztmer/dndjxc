#!/bin/sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "请先安装 Node.js 22 或以上"
  exit 1
fi
exec node one-click-run.mjs
